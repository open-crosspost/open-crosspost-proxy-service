import { ApiErrorCode, ErrorDetails, Platform } from '@crosspost/types';
import { ApiPartialResponseError, ApiRequestError, ApiResponseError } from 'twitter-api-v2';
import { PlatformError } from '../../../errors/platform-error.ts';
import { sanitizeErrorDetails } from '../../../utils/error-sanitizer.utils.ts';

/**
 * Twitter Error class for Twitter-specific errors
 * Extends PlatformError to ensure it can be handled generically
 */
export class TwitterError extends PlatformError {
  constructor(
    message: string,
    code: ApiErrorCode = ApiErrorCode.PLATFORM_ERROR,
    details?: ErrorDetails,
    recoverable: boolean = false,
  ) {
    super(
      message,
      code,
      Platform.TWITTER,
      details,
      recoverable,
    );
  }

  /**
   * Parse a Twitter API error and convert it to our standardized PlatformError format
   * @param error The Twitter API error
   * @returns A TwitterError instance
   */
  static fromTwitterApiError(error: unknown): TwitterError {
    // If already a PlatformError, return it directly
    if (error instanceof PlatformError) {
      return error as TwitterError;
    }

    // Handle ApiRequestError (network/connection errors)
    if (error instanceof ApiRequestError) {
      return TwitterError.fromRequestError(error);
    }

    // Handle ApiPartialResponseError (partial response errors)
    if (error instanceof ApiPartialResponseError) {
      return TwitterError.fromPartialResponseError(error);
    }

    // Handle ApiResponseError (Twitter API response errors)
    if (error instanceof ApiResponseError) {
      return TwitterError.fromResponseError(error);
    }

    // Handle generic errors
    if (error instanceof Error) {
      return new TwitterError(
        error.message,
        ApiErrorCode.UNKNOWN_ERROR,
        sanitizeErrorDetails({
          originalError: error,
        }),
        false,
      );
    }

    // Handle unknown errors
    return new TwitterError(
      'Unknown Twitter API error',
      ApiErrorCode.UNKNOWN_ERROR,
      sanitizeErrorDetails({
        originalError: error,
      }),
      false,
    );
  }

  /**
   * Parse a Twitter API request error
   * @param error The Twitter API request error
   * @returns A TwitterError instance
   */
  private static fromRequestError(error: ApiRequestError): TwitterError {
    const errorMessage = error.requestError instanceof Error
      ? error.requestError.message
      : String(error.requestError || error.message);

    return new TwitterError(
      `Twitter API request error: ${errorMessage}`,
      ApiErrorCode.NETWORK_ERROR,
      sanitizeErrorDetails({
        platformErrorCode: 502,
        platformMessage: errorMessage,
        platformErrorType: error.type,
        originalError: error,
        error: error.error,
        type: error.type,
        request: error.request,
        requestError: error.requestError,
      }),
      true, // Network errors are typically recoverable
    );
  }

  /**
   * Parse a Twitter API partial response error
   * @param error The Twitter API partial response error
   * @returns A TwitterError instance
   */
  private static fromPartialResponseError(
    error: ApiPartialResponseError,
  ): TwitterError {
    const errorMessage = error.responseError instanceof Error
      ? error.responseError.message
      : String(error.responseError || error.message);

    return new TwitterError(
      `Twitter API partial response error: ${errorMessage}`,
      ApiErrorCode.NETWORK_ERROR,
      sanitizeErrorDetails({
        platformErrorCode: 502,
        platformMessage: errorMessage,
        platformErrorType: error.type,
        originalError: error,
        error: error.error,
        type: error.type,
        request: error.request,
        responseError: error.responseError,
        rawContent: error.rawContent,
        response: error.response,
      }),
      true, // Partial response errors are typically recoverable
    );
  }

  /**
   * Parse a Twitter API response error
   * @param error The Twitter API response error
   * @returns A TwitterError instance
   */
  private static fromResponseError(error: ApiResponseError): TwitterError {
    const errorMessage = error.message;
    const twitterErrors = error.errors || [];

    // Create base error details
    const details: ErrorDetails = sanitizeErrorDetails({
      platformErrorCode: error.code || 500,
      platformMessage: errorMessage,
      platformErrorType: error.type,
      platformErrors: twitterErrors,
      originalError: error,
      error: error.error,
      type: error.type,
      request: error.request,
      data: error.data,
      headers: error.headers,
      response: error.response,
      errors: twitterErrors,
    });

    // Handle rate limit errors
    if (error.rateLimitError) {
      details.rateLimit = error.rateLimit;
      return new TwitterError(
        `Twitter rate limit exceeded: ${errorMessage}`,
        ApiErrorCode.RATE_LIMITED,
        details,
        true, // Rate limit errors are recoverable
      );
    }

    // Handle auth errors
    if (error.isAuthError) {
      return new TwitterError(
        `Twitter authentication error: ${errorMessage}`,
        ApiErrorCode.UNAUTHORIZED,
        details,
        true, // Auth errors may be recoverable with token refresh
      );
    }

    // Handle specific error codes before the general status code switch
    // Duplicate Content (often 403 in v2, but check internal errors too)
    if (error.errors?.some((e) => 'code' in e && e.code === 187)) {
      return new TwitterError(
        `Duplicate content: ${errorMessage}`,
        ApiErrorCode.DUPLICATE_CONTENT,
        details,
        false, // Duplicate content requires user action
      );
    }

    // Handle other errors based on status code
    switch (error.code) {
      case 404: // Not Found
        return new TwitterError(
          `Resource not found: ${errorMessage}`,
          ApiErrorCode.NOT_FOUND,
          details,
          false,
        );
      case 403:
        return new TwitterError(
          `Access forbidden: ${errorMessage}`,
          ApiErrorCode.FORBIDDEN,
          details,
          false, // Not recoverable
        );
      case 400: // Bad Request
        if (
          error.data && typeof error.data === 'object' &&
          'error' in error.data && error.data.error === 'invalid_grant'
        ) {
          return new TwitterError(
            `Token refresh failed: Invalid or expired refresh token`,
            ApiErrorCode.UNAUTHORIZED,
            {
              ...details,
              refreshFailure: true,
              message: 'Refresh token is invalid or expired. User needs to re-authenticate.',
              errorData: error.data,
            },
            false, // Not recoverable without user re-authentication
          );
        }
        return new TwitterError(
          `Invalid request: ${errorMessage}`,
          ApiErrorCode.INVALID_REQUEST, // Use a generic invalid request code
          details,
          false,
        );
      case 503:
        return new TwitterError(
          `Twitter service unavailable: ${errorMessage}`,
          ApiErrorCode.PLATFORM_UNAVAILABLE,
          details,
          true,
        );
      default:
        return new TwitterError(
          `Twitter API error: ${errorMessage}`,
          ApiErrorCode.PLATFORM_ERROR,
          details,
          false,
        );
    }
  }
}
