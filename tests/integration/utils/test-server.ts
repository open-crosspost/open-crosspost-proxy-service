import { CreatePostRequestSchema } from '@crosspost/types';
import type { Context } from '../../../deps.ts';
import { Hono, z } from '../../../deps.ts';
import { ValidationMiddleware } from '../../../src/middleware/validation.middleware.ts';
import { createSuccessResponse } from '../../../src/utils/response.utils.ts';
import { MockActivityController, TestCreateController } from './mock-controllers.ts';

/**
 * Creates a test server with real controller logic for testing
 * @returns A Hono app configured with the TestCreateController and MockActivityController
 */
export function createTestServer() {
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

  // Add endpoint that matches SDK's expected path for post creation
  app.post('/api/post', ValidationMiddleware.validateBody(CreatePostRequestSchema), async (c) => {
    // Use the test controller to handle the request
    return testController.handle(c);
  });

  // Add activity endpoints
  app.get('/api/activity', async (c) => {
    return MockActivityController.handleGetLeaderboard(c);
  });

  app.get('/api/activity/:signerId', async (c) => {
    return MockActivityController.handleGetAccountActivity(c);
  });

  // Add account posts endpoint
  app.get('/api/activity/:signerId/posts', async (c) => {
    // For simplicity, reuse the account activity handler
    return MockActivityController.handleGetAccountActivity(c);
  });

  // Add validation test endpoints

  // Body validation test endpoint
  app.post(
    '/api/validation-test/body',
    ValidationMiddleware.validateBody(
      z.object({
        requiredField: z.string().min(1),
        numericField: z.number().positive(),
        arrayField: z.array(z.string()).min(1),
      }),
    ),
    async (c) => {
      // If validation passes, return success
      // Ensure data is defined, defaulting to {} if validatedBody is undefined
      const validatedData = (c as any).validatedBody ?? {};
      return c.json({
        success: true,
        data: validatedData,
        meta: {
          requestId: (c as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    },
  );

  // Query validation test endpoint
  app.get(
    '/api/validation-test/query',
    ValidationMiddleware.validateQuery(
      z.object({
        requiredParam: z.string().min(1),
        numericParam: z.coerce.number().positive(),
        optionalParam: z.string().optional(),
      }),
    ),
    async (c) => {
      // If validation passes, return success
      return c.json({
        success: true,
        data: (c as any).validatedQuery,
        meta: {
          requestId: (c as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    },
  );

  // Params validation test endpoint
  app.get(
    '/api/validation-test/params/:id/:category',
    ValidationMiddleware.validateParams(
      z.object({
        id: z.string().uuid(),
        category: z.enum(['news', 'sports', 'tech']),
      }),
    ),
    async (c) => {
      // If validation passes, return success
      return c.json({
        success: true,
        data: (c as any).validatedParams,
        meta: {
          requestId: (c as any).requestId,
          timestamp: new Date().toISOString(),
        },
      });
    },
  );

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
        await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay before retry
        continue;
      }
      throw error; // Rethrow if we've exhausted retries or it's another error
    }
  }

  throw new Error(`Failed to start server after ${retries} attempts`);
}

/**
 * Creates a mock paginated response for testing
 * @param c Hono context
 * @param data Response data
 * @param limit Maximum number of items per page
 * @param offset Number of items to skip
 * @param total Total number of items
 * @returns Response with pagination metadata
 */
export function createMockPaginatedResponse<T>(
  c: Context,
  data: T,
  limit: number,
  offset: number,
  total: number,
): Response {
  return c.json(createSuccessResponse(c, data, {
    pagination: {
      limit,
      offset,
      total,
    },
  }));
}
