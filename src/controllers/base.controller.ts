import { ApiErrorCode, errorCodeToStatusCode, PlatformName, StatusCode } from '@crosspost/types';
import { Context } from '../deps.ts';
import { AuthService } from '../domain/services/auth.service.ts';
import { ApiError } from '../errors/api-error.ts';
import { PlatformError } from '../errors/platform-error.ts';
import { createErrorDetail, createErrorResponse } from '../utils/response.utils.ts';

const MAX_AUTH_RETRIES = 1;

/**
 * Base Controller
 * Contains common functionality for all controllers
 */
export abstract class BaseController {
  /**
   * Executes a platform-specific operation with automatic retry logic for authorization errors.
   * @param operationFn The async function to execute the platform operation.
   * @param platform The platform on which the operation is performed.
   * @param userId The user ID on the platform.
   * @param signerId The NEAR account ID of the user performing the operation.
   * @param authService An instance of AuthService to handle unlinking on persistent auth failure.
   * @returns The result of the operationFn.
   * @throws Throws an error if the operation fails after retries or for non-auth reasons.
   */
  protected async executePlatformOperationWithRetry<T>(
    operationFn: () => Promise<T>,
    platform: PlatformName,
    userId: string,
    signerId: string,
    authService: AuthService, // Added authService as a parameter
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await operationFn();
      } catch (error) {
        const processedError = error instanceof PlatformError ? error : new PlatformError(
          error instanceof Error ? error.message : 'Unknown operation error',
          ApiErrorCode.PLATFORM_ERROR, // Default to platform error
          platform,
          { originalError: error, userId, signerId },
          false,
        );

        if (processedError.code === ApiErrorCode.UNAUTHORIZED && attempt < MAX_AUTH_RETRIES) {
          attempt++;
          console.warn(
            `Operation for ${platform}:${userId} (Signer: ${signerId}) failed with auth error (attempt ${attempt}/${MAX_AUTH_RETRIES}). Retrying...`,
          );
          // Delay before retry to allow for token refresh propagation or brief network issues
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Increasing delay
        } else {
          if (processedError.code === ApiErrorCode.UNAUTHORIZED) {
            // Auth error persisted after retries, attempt to unlink
            console.error(
              `Persistent auth error for ${platform}:${userId} (Signer: ${signerId}) after ${attempt} retries. Unlinking account.`,
              processedError,
            );
            try {
              await authService.unlinkAccount(signerId, platform, userId);
              console.log(
                `Successfully unlinked ${platform}:${userId} from ${signerId} due to persistent auth error.`,
              );
            } catch (unlinkError) {
              console.error(
                `Failed to automatically unlink ${platform}:${userId} from ${signerId} after persistent auth error:`,
                unlinkError,
              );
            }
          }
          throw processedError; // Re-throw the error to be handled by the caller
        }
      }
    }
  }

  /**
   * Handle errors from platform operations
   * @param error Error to handle
   * @param c Hono context for response
   */
  protected handleError(
    error: unknown,
    c: Context,
  ): Response {
    // Log the error with more context if available from the error object itself
    if (error instanceof PlatformError) {
      console.error(
        `PlatformError in ${this.constructor.name} for ${error.platform} user ${
          error.details?.userId || 'N/A'
        }:`,
        error.message,
        error.details,
        error.stack,
      );
    } else if (error instanceof ApiError) {
      console.error(
        `ApiError in ${this.constructor.name}:`,
        error.message,
        error.details,
        error.stack,
      );
    } else {
      console.error(`Generic error in ${this.constructor.name}:`, error);
    }

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
