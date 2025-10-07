import { ApiErrorCode, errorCodeToStatusCode } from '@crosspost/types';
import { Context, MiddlewareHandler, Next } from '../../deps.ts';
import { ApiError, createApiError } from '../errors/api-error.ts';
import { NearAuthService } from '../infrastructure/security/near-auth-service.ts';
import { createErrorDetail, createErrorResponse } from '../utils/response.utils.ts';

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
