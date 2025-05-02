import { ApiErrorCode, Platform, type StatusCode } from '@crosspost/types';
import type { Context } from '../../../deps.ts';
import { Hono } from '../../../deps.ts';
import {
  createErrorDetail,
  createMultiStatusData,
  createSuccessDetail,
  createSuccessResponse
} from '../../../src/utils/response.utils.ts';
import { TestCreateController } from './mock-controllers.ts';

/**
 * Creates a test server for integration testing
 * @returns A Hono app configured for testing
 */
export function createTestServer() {
  const app = new Hono();

  app.use('*', async (c, next) => {
    const requestId = crypto.randomUUID();
    (c as any).requestId = requestId;

    // Extract signerId from headers
    const authHeader = c.req.header('Authorization');
    const nearAccountHeader = c.req.header('X-Near-Account');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const authData = JSON.parse(authHeader.substring(7));
        (c as any).signerId = authData.account_id;
      } catch (e) {
        (c as any).signerId = 'test.near';
      }
    } else if (nearAccountHeader) {
      (c as any).signerId = nearAccountHeader;
    } else {
      (c as any).signerId = 'test.near';
    }

    await next();
  });

  return app;
}

/**
 * Creates a test server with real controller logic for testing
 * @returns A Hono app configured with the TestCreateController
 */
export function createRealControllerTestServer() {
  const app = new Hono();

  // Add middleware for request context
  app.use('*', async (c, next) => {
    const requestId = crypto.randomUUID();
    (c as any).requestId = requestId;

    // Extract signerId from headers
    const authHeader = c.req.header('Authorization');
    const nearAccountHeader = c.req.header('X-Near-Account');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const authData = JSON.parse(authHeader.substring(7));
        (c as any).signerId = authData.account_id;
      } catch (e) {
        (c as any).signerId = 'test.near';
      }
    } else if (nearAccountHeader) {
      (c as any).signerId = nearAccountHeader;
    } else {
      (c as any).signerId = 'test.near';
    }
    
    await next();
  });

  // Create test controller
  const testController = new TestCreateController();

  // Add endpoint that matches SDK's expected path
  app.post('/api/post', async (c) => {
    // Parse and validate request body
    const body = await c.req.json();
    (c as any).validatedBody = body;

    // Use the test controller to handle the request
    return testController.handle(c);
  });

  return app;
}

/**
 * Starts a test server with dynamic port assignment
 * @param app The Hono app to serve
 * @param retries Number of retries if port is in use (default: 3)
 * @returns A promise resolving to the server and URL
 */
export async function startTestServer(app: Hono, retries = 3): Promise<{
  server: Deno.HttpServer;
  url: URL;
}> {
  let attempt = 0;

  while (attempt < retries) {
    try {
      // Create a listener with port 0 to let the OS assign an available port
      const listener = Deno.listen({ port: 0 });
      const port = (listener.addr as Deno.NetAddr).port;
      listener.close(); // Close the listener

      // Start the server on the assigned port
      const server = Deno.serve({ port }, app.fetch);
      const url = new URL(`http://localhost:${port}`);

      return { server, url };
    } catch (error) {
      if (error instanceof Deno.errors.AddrInUse && attempt < retries - 1) {
        // If address is in use and we have retries left, try again
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay before retry
        continue;
      }
      throw error; // Rethrow if we've exhausted retries or it's another error
    }
  }

  throw new Error(`Failed to start server after ${retries} attempts`);
}

/**
 * Creates a mock multi-status response for testing
 * @param c Hono context
 * @param successCount Number of successful operations
 * @param errorCount Number of failed operations
 * @param errorCode Error code for failed operations
 * @returns Response with multi-status data
 */
export function createMockMultiStatusResponse(
  c: Context,
  successCount: number,
  errorCount: number,
  errorCode: ApiErrorCode = ApiErrorCode.PLATFORM_ERROR
): Response {
  const successResults = Array.from({ length: successCount }, (_, i) =>
    createSuccessDetail(
      Platform.TWITTER,
      `success-user-${i}`,
      {
        id: `post-${i}`,
        text: 'Test post content',
        createdAt: new Date().toISOString(),
        success: true
      }
    )
  );

  const errorDetails = Array.from({ length: errorCount }, (_, i) =>
    createErrorDetail(
      `Error for user ${i}`,
      errorCode,
      false,
      {
        platform: Platform.TWITTER,
        userId: `error-user-${i}`
      }
    )
  );

  const multiStatusData = createMultiStatusData(successResults, errorDetails);

  // Determine appropriate status code
  let statusCode: StatusCode = 200;
  if (successCount === 0 && errorCount > 0) {
    // Complete failure - use appropriate status code based on error type
    statusCode = errorCode === ApiErrorCode.RATE_LIMITED ? 429 :
      errorCode === ApiErrorCode.UNAUTHORIZED ? 401 :
        errorCode === ApiErrorCode.VALIDATION_ERROR ? 400 : 502;
  } else if (successCount > 0 && errorCount > 0) {
    // Partial success - use 207 Multi-Status
    statusCode = 207;
  }

  c.status(statusCode);
  return c.json(createSuccessResponse(c, multiStatusData));
}

/**
 * Creates a mock paginated response for testing
 * @param c Hono context
 * @param data Response data
 * @param page Current page
 * @param perPage Items per page
 * @param total Total items
 * @returns Response with pagination metadata
 */
export function createMockPaginatedResponse<T>(
  c: Context,
  data: T,
  page: number,
  perPage: number,
  total: number
): Response {
  const totalPages = Math.ceil(total / perPage);

  return c.json(createSuccessResponse(c, data, {
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      nextCursor: page < totalPages ? String(page + 1) : undefined,
      prevCursor: page > 1 ? String(page - 1) : undefined
    }
  }));
}

/**
 * Creates a mock validation error response
 * @param c Hono context
 * @param message Error message
 * @param details Validation details
 * @returns Response with validation error
 */
export function createMockValidationErrorResponse(
  c: Context,
  message: string,
  details: Record<string, unknown> = {}
): Response {
  const errorDetail = createErrorDetail(
    message,
    ApiErrorCode.VALIDATION_ERROR,
    false,
    details
  );

  c.status(400);
  return c.json({
    success: false,
    errors: [errorDetail],
    meta: {
      requestId: c.get('requestId'),
      timestamp: new Date().toISOString()
    }
  });
}
