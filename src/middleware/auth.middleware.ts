import { ApiError, ApiErrorCode } from '@crosspost/types';
import { Context, MiddlewareHandler, Next } from '../../deps.ts';
import { extractAndValidateNearAuth } from '../utils/near-auth.utils.ts';

/**
 * Authentication middleware for Hono
 * Validates NEAR Signature
 */
export class AuthMiddleware {
  /**
   * Validate NEAR signature middleware
   * @returns Middleware handler
   */
  static validateNearSignature(): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      try {
        // Extract and validate NEAR auth data
        const { signerId } = await extractAndValidateNearAuth(c);

        // Set the NEAR account ID in the context for use in controllers
        c.set('signerId', signerId);

        await next();
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(
          ApiErrorCode.FORBIDDEN,
          'NEAR authentication failed',
          401,
        );
      }
    };
  }
}
