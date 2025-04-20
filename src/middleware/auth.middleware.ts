import { ApiErrorCode } from '@crosspost/types';
import { Context, MiddlewareHandler, Next } from '../../deps.ts';
import { NearAuthService } from '../infrastructure/security/near-auth-service.ts';
import { ApiError, createApiError } from '../errors/api-error.ts';

export class AuthMiddleware {
  private static nearAuthService: NearAuthService;

  /**
   * Initialize the middleware with dependencies
   * @param nearAuthService The NEAR authentication service
   */
  static initialize(nearAuthService: NearAuthService) {
    AuthMiddleware.nearAuthService = nearAuthService;
  }

  /**
   * Validate NEAR signature middleware
   * @returns Middleware handler
   * @throws {ApiError} If authentication fails
   */
  static validateNearSignature(): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      try {
        if (!AuthMiddleware.nearAuthService) {
          throw createApiError(ApiErrorCode.INTERNAL_ERROR, 'NearAuthService not initialized');
        }

        let signerId: string;

        // For GET requests, only require X-Near-Account header
        if (c.req.method === 'GET') {
          signerId = AuthMiddleware.nearAuthService.extractNearAccountHeader(c);

          // Check if the NEAR account is authorized (skip check for /auth/authorize/near)
          if (!c.req.path.endsWith('/auth/authorize/near')) {
            const authStatus = await AuthMiddleware.nearAuthService.getNearAuthorizationStatus(
              signerId,
            );
            if (authStatus < 0) { // -1 means not authorized
              throw createApiError(ApiErrorCode.UNAUTHORIZED, 'NEAR account is not authorized');
            }
          }
        } else {
          // For other requests, require full NEAR auth validation
          const { signerId: validatedSignerId } = await AuthMiddleware.nearAuthService
            .extractAndValidateNearAuth(c);
          signerId = validatedSignerId;
        }

        // Set the NEAR account ID in the context for use in controllers
        c.set('signerId', signerId);

        await next();
      } catch (error) {
        // If it's already an ApiError, rethrow it
        if (error instanceof ApiError) {
          throw error;
        }
        // Otherwise wrap it in an ApiError
        throw createApiError(ApiErrorCode.UNAUTHORIZED, 'NEAR authentication failed', {
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    };
  }
}
