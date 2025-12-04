import { ApiErrorCode, errorCodeToStatusCode } from '@crosspost/types';
import { Context, MiddlewareHandler, Next } from '../../deps.js';
import { ApiError, createApiError } from '../errors/api-error.js';
import { NearAuthService } from '../infrastructure/security/near-auth-service.js';
import { createErrorDetail, createErrorResponse } from '../utils/response.utils.js';

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

        // Always require full NEAR auth validation for enhanced security
        // This ensures all requests are properly signed and verified
        const { signerId } = await AuthMiddleware.nearAuthService
          .extractAndValidateNearAuth(c);

        // Set the NEAR account ID in the context for use in controllers
        c.set('signerId', signerId);

        await next();
      } catch (error) {
        if (error instanceof ApiError) {
          c.status(error.status);
          return c.json(
            createErrorResponse(c, [
              createErrorDetail(
                error.message,
                error.code,
                error.recoverable,
                error.details,
              ),
            ]),
          );
        }
        c.status(errorCodeToStatusCode[ApiErrorCode.UNAUTHORIZED]);
        return c.json(
          createErrorResponse(c, [
            createErrorDetail(
              'NEAR authentication failed',
              ApiErrorCode.UNAUTHORIZED,
              false,
              {
                originalError: error instanceof Error ? error.message : String(error),
              },
            ),
          ]),
        );
      }
    };
  }
}
