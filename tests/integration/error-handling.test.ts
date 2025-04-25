import { ApiErrorCode, Platform } from '@crosspost/types';
import { assertEquals, assertExists } from 'jsr:@std/assert';
import { beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { Hono } from '../../deps.ts';
import { createApiError } from '../../src/errors/api-error.ts';
import { createPlatformError } from '../../src/errors/platform-error.ts';
import { errorMiddleware } from '../../src/middleware/error.middleware.ts';
import { RequestContextMiddleware } from '../../src/middleware/request-context.middleware.ts';

// Helper function to create a test app with error middleware
function createTestApp() {
  const app = new Hono();

  // Add request context middleware first (to set requestId)
  app.use('*', RequestContextMiddleware.initializeContext);

  // Add error middleware
  app.use('*', errorMiddleware());

  return app;
}

describe('Error Handling Middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('ApiError handling', () => {
    it('should properly format ApiError responses', async () => {
      // Add a test route that throws an ApiError
      app.get('/test-api-error', (c) => {
        throw createApiError(
          ApiErrorCode.INTERNAL_ERROR,
          'Something went wrong',
          { operation: 'test' },
          false
        );
      });

      // Make a request to the test route
      const req = new Request('https://example.com/test-api-error');
      const res = await app.fetch(req);

      // Verify the response
      assertEquals(res.status, 500); // INTERNAL_ERROR maps to 500

      const body = await res.json();
      assertEquals(body.success, false);
      assertExists(body.errors);
      assertEquals(body.errors.length, 1);
      assertEquals(body.errors[0].message, 'Something went wrong');
      assertEquals(body.errors[0].code, ApiErrorCode.INTERNAL_ERROR);
      assertEquals(body.errors[0].recoverable, false);
      assertEquals(body.errors[0].details.operation, 'test');

      // Verify meta information
      assertExists(body.meta);
      assertExists(body.meta.requestId);
      assertExists(body.meta.timestamp);
    });

  });

  describe('PlatformError handling', () => {
    it('should properly format PlatformError responses', async () => {
      // Add a test route that throws a PlatformError
      app.get('/test-platform-error', (c) => {
        throw createPlatformError(
          ApiErrorCode.PLATFORM_UNAVAILABLE,
          'Twitter API is down',
          Platform.TWITTER,
          { retryAfter: '30s' },
          false
        );
      });

      // Make a request to the test route
      const req = new Request('https://example.com/test-platform-error');
      const res = await app.fetch(req);

      // Verify the response
      assertEquals(res.status, 503); // PLATFORM_UNAVAILABLE maps to 503

      const body = await res.json();
      assertEquals(body.success, false);
      assertExists(body.errors);
      assertEquals(body.errors[0].message, 'Twitter API is down');
      assertEquals(body.errors[0].code, ApiErrorCode.PLATFORM_UNAVAILABLE);

      // Verify platform is included in details
      assertExists(body.errors[0].details);
      assertEquals(body.errors[0].details.platform, Platform.TWITTER);
      assertEquals(body.errors[0].details.retryAfter, '30s');
    });
  });

  describe('Standard Error handling', () => {
    it('should convert standard Error to ApiError response', async () => {
      // Add a test route that throws a standard Error
      app.get('/test-standard-error', () => {
        throw new Error('Something went wrong');
      });

      // Make a request to the test route
      const req = new Request('https://example.com/test-standard-error');
      const res = await app.fetch(req);

      // Verify the response
      assertEquals(res.status, 500);

      const body = await res.json();
      assertEquals(body.success, false);
      assertExists(body.errors);
      assertEquals(body.errors[0].message, 'An internal server error occurred.');
      assertEquals(body.errors[0].code, ApiErrorCode.INTERNAL_ERROR);
      assertEquals(body.errors[0].recoverable, false);

      // Verify error name is included in details
      assertExists(body.errors[0].details);
      assertEquals(body.errors[0].details.errorName, 'Error');
    });
  });

  describe('Array of errors handling', () => {
    it('should handle arrays of ApiErrors with multi-status', async () => {
      // Add a test route that throws an array of ApiErrors
      app.get('/test-multi-error', () => {
        throw [
          createPlatformError(
            ApiErrorCode.RATE_LIMITED,
            'Rate limited on Twitter',
            Platform.TWITTER,
            { retryAfter: '60s' },
            false
          ),
          createApiError(
            ApiErrorCode.INTERNAL_ERROR,
            'Something went wrong',
            { operation: 'test' },
            false
          )
        ];
      });

      // Make a request to the test route
      const req = new Request('https://example.com/test-multi-error');
      const res = await app.fetch(req);

      // Verify the response
      assertEquals(res.status, 207); // Multi-Status

      const body = await res.json();
      assertEquals(body.success, false);
      assertExists(body.errors);
      assertEquals(body.errors.length, 2);

      // Verify first error (PlatformError)
      assertEquals(body.errors[0].message, 'Rate limited on Twitter');
      assertEquals(body.errors[0].code, ApiErrorCode.RATE_LIMITED);
      assertEquals(body.errors[0].details.platform, Platform.TWITTER);
      assertEquals(body.errors[0].details.retryAfter, '60s');

      // Verify second error (ApiError)
      assertEquals(body.errors[1].message,'Something went wrong');
      assertEquals(body.errors[1].code, ApiErrorCode.INTERNAL_ERROR);
      assertEquals(body.errors[1].recoverable, false);
      assertEquals(body.errors[1].details.operation, 'test');
    });

    it('should handle arrays of ApiErrors with same status', async () => {
      // Add a test route that throws an array of ApiErrors with the same status
      app.get('/test-same-status-errors', () => {
        throw [
          createApiError(ApiErrorCode.INTERNAL_ERROR, 'First error', { operation: 'op1' }, true),
          createApiError(ApiErrorCode.INTERNAL_ERROR, 'Second error', { operation: 'op2' }, true)
        ];
      });

      // Make a request to the test route
      const req = new Request('https://example.com/test-same-status-errors');
      const res = await app.fetch(req);

      // Verify the response
      assertEquals(res.status, 500); // All errors are INTERNAL_ERROR (500)

      const body = await res.json();
      assertEquals(body.success, false);
      assertExists(body.errors);
      assertEquals(body.errors.length, 2);

      // Verify both errors have the same code but different details
      assertEquals(body.errors[0].code, ApiErrorCode.INTERNAL_ERROR);
      assertEquals(body.errors[1].code, ApiErrorCode.INTERNAL_ERROR);
      assertEquals(body.errors[0].details.operation, 'op1');
      assertEquals(body.errors[1].details.operation, 'op2');
    });
  });

  describe('HTTPException handling', () => {
    it('should handle Hono HTTPException', async () => {
      // Add a test route that uses Hono's notFound helper
      app.get('/test-http-exception', (c) => {
        return c.notFound();
      });

      // Make a request to the test route
      const req = new Request('https://example.com/test-http-exception');
      const res = await app.fetch(req);

      // Verify the response
      assertEquals(res.status, 404);

      const body = await res.json();
      assertEquals(body.success, false);
      assertExists(body.errors);
      assertEquals(body.errors[0].message, 'Not Found');
      assertEquals(body.errors[0].code, ApiErrorCode.UNKNOWN_ERROR);
      assertEquals(body.errors[0].recoverable, false);
    });
  });
});
