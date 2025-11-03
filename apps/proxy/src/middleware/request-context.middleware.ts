import { Context, Next } from '../../deps.ts';
import * as uuid from 'jsr:@std/uuid';

/**
 * Middleware to initialize request context
 * - Generates and tracks request IDs
 * - Extracts and stores platform and userId from request parameters
 */
export class RequestContextMiddleware {
  /**
   * Initialize request context
   * @param c Hono context
   * @param next Next middleware function
   */
  static async initializeContext(c: Context, next: Next) {
    // Generate and store request ID
    const requestId = uuid.v1.generate();
    c.set('requestId', requestId);
    c.res.headers.set('X-Request-ID', requestId);

    // Extract platform and userId from request parameters if available
    const platform = c.req.param('platform');
    if (platform) {
      c.set('platform', platform);
    }

    const userId = c.req.param('userId');
    if (userId) {
      c.set('userId', userId);
    }

    await next();
  }
}
