import { ApiErrorCode, errorCodeToStatusCode, StatusCode } from '@crosspost/types';
import { Context } from '../deps.ts';
import { ApiError } from '../errors/api-error.ts';
import { PlatformError } from '../errors/platform-error.ts';
import { createErrorDetail, createErrorResponse } from '../utils/response.utils.ts';

/**
 * Base Controller
 * Contains common functionality for all controllers
 */
export abstract class BaseController {
  /**
   * Handle errors from platform operations
   * @param error Error to handle
   * @param c Hono context for response
   * @param platform Platform name (for generic errors)
   * @param userId User ID on the platform (for generic errors)
   */
  protected handleError(
    error: unknown,
    c: Context,
  ): Response {
    console.error(`Error in ${this.constructor.name}:`, error);

    // Get context values
    const platform = c.get('platform');
    const userId = c.get('userId');
    const signerId = c.get('signerId') as string;

    // Handle platform-specific errors
    if (error instanceof ApiError) {
      c.status((errorCodeToStatusCode[error.code]) as StatusCode);

      if (error instanceof PlatformError) {
        // For platform errors, include platform, userId (if available), and original details
        const errorDetails = {
          platform: error.platform,
          ...(userId && { userId }), // Only include userId if it exists
          ...(signerId && { signerId }), // Only include signerId if it exists
          ...error.details,
        };

        return c.json(
          createErrorResponse(
            c,
            [
              createErrorDetail(
                error.message,
                error.code,
                error.recoverable,
                errorDetails,
              ),
            ],
          ),
        );
      }

      // For non-platform API errors, include any available context
      const errorDetails = {
        ...(platform && { platform }),
        ...(userId && { userId }),
        ...(signerId && { signerId }),
        ...error.details,
      };

      c.status((errorCodeToStatusCode[error.code]) as StatusCode);
      return c.json(
        createErrorResponse(
          c,
          [
            createErrorDetail(
              error.message,
              error.code,
              error.recoverable,
              errorDetails,
            ),
          ],
        ),
      );
    }

    // Handle generic errors
    const errorDetails = {
      ...(platform && { platform }),
      ...(userId && { userId }),
      ...(signerId && { signerId }),
    };

    c.status(500);
    return c.json(
      createErrorResponse(
        c,
        [
          createErrorDetail(
            error instanceof Error ? error.message : 'An unexpected error occurred',
            ApiErrorCode.INTERNAL_ERROR,
            false,
            Object.keys(errorDetails).length > 0 ? errorDetails : undefined,
          ),
        ],
      ),
    );
  }
}
