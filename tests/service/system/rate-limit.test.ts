import { ValidationMiddleware } from '../../../src/middleware/validation.middleware.ts';
import { 
  ApiErrorCode, 
  Platform,
  RateLimitPlatformEndpointParamsSchema,
  RateLimitPlatformParamsSchema,
  RateLimitEndpointParamSchema
} from '@crosspost/types';
import { assertEquals, assertExists } from 'jsr:@std/assert';
import { afterEach, beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { RateLimitController } from '../../../src/controllers/rate-limit.controller.ts';
import type { Hono as HonoType } from '../../../src/deps.ts';
import { Hono } from '../../../src/deps.ts';
import { createApiError } from '../../../src/errors/api-error.ts';
import { createPlatformError } from '../../../src/errors/platform-error.ts';
import { errorMiddleware } from '../../../src/middleware/error.middleware.ts';
import { RequestContextMiddleware } from '../../../src/middleware/request-context.middleware.ts';
import { UsageRateLimitMiddleware } from '../../../src/middleware/usage-rate-limit.middleware.ts';
import { MockKvStore } from '../../mocks/kv-store-mock.ts';
import { MockRateLimitService } from '../../mocks/rate-limit-service-mock.ts';
import { setupTestApp, type TestAppEnv } from '../../utils/test-utils.ts';

// Helper function to create a test app with error middleware
function setupErrorTestApp(configureRoutes: (app: Hono<TestAppEnv>) => void): Hono<TestAppEnv> {
  const app = new Hono<TestAppEnv>();

  // Add request context middleware first (to set requestId)
  app.use('*', RequestContextMiddleware.initializeContext);

  // Add error middleware
  app.use('*', errorMiddleware());

  // Add mock auth middleware
  app.use('*', (c, next) => {
    c.set('signerId', 'test.near');
    return next();
  });

  // Configure routes
  configureRoutes(app);

  return app;
}

describe('Rate Limit Controller', () => {
  let app: HonoType<TestAppEnv>;
  let controller: RateLimitController;
  let mockRateLimitService: MockRateLimitService;
  let mockKvStore: MockKvStore;

  beforeEach(() => {
    // Create mock RateLimitService
    mockRateLimitService = new MockRateLimitService();

    // Create mock KvStore
    mockKvStore = new MockKvStore(['usage_rate_limit']);

    // Create the controller with the mock service and KvStore
    controller = new RateLimitController(mockRateLimitService, mockKvStore);

    // Initialize UsageRateLimitMiddleware with test configuration
    UsageRateLimitMiddleware.initialize({
      maxPostsPerDay: 10,
    });

    // Setup test app with routes
    app = setupTestApp((hono) => {
      hono.get('/rate-limits/:platform/:endpoint', ValidationMiddleware.validateParams(RateLimitPlatformEndpointParamsSchema), (c) => controller.getRateLimitStatus(c));
      hono.get('/rate-limits/:platform', ValidationMiddleware.validateParams(RateLimitPlatformParamsSchema), (c) => controller.getAllRateLimits(c));
      hono.get('/usage-rate-limits/:endpoint', ValidationMiddleware.validateParams(RateLimitEndpointParamSchema), (c) => controller.getUsageRateLimit(c));
    });
  });

  afterEach(async () => {
    // Close the mock KvStore
    await mockKvStore.close();
  });

  // Test cases for getRateLimitStatus
  it('should get rate limit status successfully', async () => {
    // Create request
    const req = new Request('https://example.com/rate-limits/twitter/test-endpoint');

    // Make the request
    const response = await app.fetch(req);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertEquals(responseBody.data.endpoint, 'test-endpoint');
    assertEquals(responseBody.data.limit, 100);
    assertEquals(responseBody.data.remaining, 95);
  });

  // Test cases for getAllRateLimits
  it('should get all rate limits successfully', async () => {
    // Create request
    const req = new Request('https://example.com/rate-limits/twitter');

    // Make the request
    const response = await app.fetch(req);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);

    const endpoints = Object.keys(responseBody.data);
    assertEquals(endpoints.length, 3); // app, endpoint1, endpoint2
    assertExists(responseBody.data.app);
    assertExists(responseBody.data.endpoint1);
    assertExists(responseBody.data.endpoint2);
    assertEquals(responseBody.data.app.limit, 1000);
    assertEquals(responseBody.data.endpoint1.endpoint, 'endpoint1');
    assertEquals(responseBody.data.endpoint2.endpoint, 'endpoint2');
  });

  // Test cases for getUsageRateLimit
  it('should get usage rate limit successfully', async () => {
    // Create request
    const req = new Request('https://example.com/usage-rate-limits/post');

    // Make the request
    const response = await app.fetch(req);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertEquals(responseBody.data.signerId, 'test.near');
    assertEquals(responseBody.data.endpoint, 'post');
    assertEquals(responseBody.data.limit, 10);
    assertEquals(responseBody.data.remaining, 10);
  });

  it('should handle existing usage rate limit record', async () => {
    // Create a mock KV store with existing data
    const customKvStore = new MockKvStore(['usage_rate_limit']);
    customKvStore.get = async <T>(key: string[]): Promise<T | null> => {
      if (key[0] === 'test.near' && key[1] === 'post') {
        return {
          signerId: 'test.near',
          endpoint: 'post',
          count: 5,
          resetTimestamp: Date.now() + 86400000, // Tomorrow
        } as unknown as T;
      }
      return null;
    };

    // Create a new controller with the custom KV store
    const testController = new RateLimitController(mockRateLimitService, customKvStore);

    // Setup a new test app with the custom controller
    const customApp = setupTestApp((hono) => {
      hono.get('/usage-rate-limits/:endpoint', ValidationMiddleware.validateParams(RateLimitEndpointParamSchema), (c) => testController.getUsageRateLimit(c));
    });

    // Create request
    const req = new Request('https://example.com/usage-rate-limits/post');

    // Make the request
    const response = await customApp.fetch(req);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertEquals(responseBody.data.signerId, 'test.near');
    assertEquals(responseBody.data.endpoint, 'post');
    assertEquals(responseBody.data.limit, 10);
    assertEquals(responseBody.data.remaining, 5); // 10 - 5 = 5

    // Clean up
    await customKvStore.close();
  });

  it('should handle internal errors gracefully', async () => {
    // Override the getRateLimitStatus method to throw an error
    mockRateLimitService.getRateLimitStatus = () => {
      throw createApiError(
        ApiErrorCode.INTERNAL_ERROR,
        'Test error',
      );
    };

    // Create a new controller with the mock service
    const errorController = new RateLimitController(mockRateLimitService);

    // Setup a new test app with the error controller
    const errorApp = setupErrorTestApp((hono) => {
      hono.get('/rate-limits/:platform/:endpoint', ValidationMiddleware.validateParams(RateLimitPlatformEndpointParamsSchema), (c) => errorController.getRateLimitStatus(c));
    });

    // Create request
    const req = new Request('https://example.com/rate-limits/twitter/test-endpoint');

    // Make the request
    const response = await errorApp.fetch(req);

    // Verify the response
    assertEquals(response.status, 500);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].code, 'INTERNAL_ERROR');
    assertEquals(responseBody.errors[0].message, 'Test error');
  });

  it('should handle platform unavailable errors', async () => {
    // Override the getAllRateLimits method to throw a platform unavailable error
    mockRateLimitService.getAllRateLimits = () => {
      throw createPlatformError(
        ApiErrorCode.PLATFORM_UNAVAILABLE,
        'Platform unavailable',
        Platform.TWITTER,
      );
    };

    // Create a new controller with the mock service
    const errorController = new RateLimitController(mockRateLimitService);

    // Setup a new test app with the error controller
    const errorApp = setupErrorTestApp((hono) => {
      hono.get('/rate-limits/:platform', ValidationMiddleware.validateParams(RateLimitPlatformParamsSchema), (c) => errorController.getAllRateLimits(c));
    });

    // Create request
    const req = new Request('https://example.com/rate-limits/twitter');

    // Make the request
    const response = await errorApp.fetch(req);

    console.log("response", response);

    // Verify the response
    assertEquals(response.status, 503);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].code, 'PLATFORM_UNAVAILABLE');
    assertEquals(responseBody.errors[0].details.platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].message, 'Platform unavailable');
  });

  it('should handle authentication errors', async () => {
    // Override the getRateLimitStatus method to throw an authentication error
    mockRateLimitService.getRateLimitStatus = () => {
      throw createPlatformError(
        ApiErrorCode.UNAUTHORIZED,
        'Authentication failed',
        Platform.TWITTER,
        { userId: 'twitter-user-1' },
      );
    };

    // Create a new controller with the mock service
    const errorController = new RateLimitController(mockRateLimitService);

    // Setup a new test app with the error controller
    const errorApp = setupErrorTestApp((hono) => {
      hono.get('/rate-limits/:platform/:endpoint', ValidationMiddleware.validateParams(RateLimitPlatformEndpointParamsSchema), (c) => errorController.getRateLimitStatus(c));
    });

    // Create request
    const req = new Request('https://example.com/rate-limits/twitter/test-endpoint');

    // Make the request
    const response = await errorApp.fetch(req);

    // Verify the response
    assertEquals(response.status, 401);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].code, 'UNAUTHORIZED');
    assertEquals(responseBody.errors[0].details.platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].details.userId, 'twitter-user-1');
  });

  it('should handle rate limit errors', async () => {
    // Override the getRateLimitStatus method to throw a rate limit error
    mockRateLimitService.getRateLimitStatus = () => {
      throw createPlatformError(
        ApiErrorCode.RATE_LIMITED,
        'Rate limit exceeded',
        Platform.TWITTER,
        { userId: 'twitter-user-1', retryAfter: 3600 },
        true, // Recoverable
      );
    };

    // Create a new controller with the mock service
    const errorController = new RateLimitController(mockRateLimitService);

    // Setup a new test app with the error controller
    const errorApp = setupErrorTestApp((hono) => {
      hono.get('/rate-limits/:platform/:endpoint', ValidationMiddleware.validateParams(RateLimitPlatformEndpointParamsSchema), (c) => errorController.getRateLimitStatus(c));
    });

    // Create request
    const req = new Request('https://example.com/rate-limits/twitter/test-endpoint');

    // Make the request
    const response = await errorApp.fetch(req);

    // Verify the response
    assertEquals(response.status, 429);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].code, 'RATE_LIMITED');
    assertEquals(responseBody.errors[0].details.platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].details.userId, 'twitter-user-1');
    assertEquals(responseBody.errors[0].recoverable, true);
    assertExists(responseBody.errors[0].details);
    assertEquals(responseBody.errors[0].details.retryAfter, 3600);
  });

  it('should handle validation errors', async () => {
    // Override the getRateLimitStatus method to throw a validation error
    mockRateLimitService.getRateLimitStatus = () => {
      throw createPlatformError(
        ApiErrorCode.VALIDATION_ERROR,
        'Invalid endpoint',
        Platform.TWITTER,
        { field: 'endpoint', message: 'Endpoint not supported' },
      );
    };

    // Create a new controller with the mock service
    const errorController = new RateLimitController(mockRateLimitService);

    // Setup a new test app with the error controller
    const errorApp = setupErrorTestApp((hono) => {
      hono.get('/rate-limits/:platform/:endpoint', ValidationMiddleware.validateParams(RateLimitPlatformEndpointParamsSchema), (c) => errorController.getRateLimitStatus(c));
    });

    // Create request
    const req = new Request('https://example.com/rate-limits/twitter/invalid-endpoint');

    // Make the request
    const response = await errorApp.fetch(req);

    // Verify the response
    assertEquals(response.status, 400);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].code, 'VALIDATION_ERROR');
    assertEquals(responseBody.errors[0].details.platform, Platform.TWITTER);
    assertExists(responseBody.errors[0].details);
    assertEquals(responseBody.errors[0].details.field, 'endpoint');
  });

  it('should handle KV store errors in getUsageRateLimit', async () => {
    // Create a mock KV store that throws an error
    const errorKvStore = new MockKvStore(['usage_rate_limit']);
    errorKvStore.get = async <T>(): Promise<T | null> => {
      throw new Error('KV store error');
    };

    // Create a new controller with the mock KV store
    const errorController = new RateLimitController(mockRateLimitService, errorKvStore);

    // Setup a new test app with the error controller
    const errorApp = setupErrorTestApp((hono) => {
      hono.get('/usage-rate-limits/:endpoint', ValidationMiddleware.validateParams(RateLimitEndpointParamSchema), (c) => errorController.getUsageRateLimit(c));
    });

    // Create request
    const req = new Request('https://example.com/usage-rate-limits/post');

    // Make the request
    const response = await errorApp.fetch(req);

    // Verify the response
    assertEquals(response.status, 500);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].code, 'INTERNAL_ERROR');
    assertEquals(responseBody.errors[0].message, 'KV store error');
  });
});
