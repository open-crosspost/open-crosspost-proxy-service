import { ApiPartialResponseError, ApiRequestError, ApiResponseError } from 'twitter-api-v2';
import { Platform } from '../../../types/platform.types.ts';
import { ApiErrorCode, PlatformError } from '../abstract/error-hierarchy.ts';

/**
 * Twitter-specific error codes
 */
export enum TwitterErrorCode {
  // Common Twitter error codes
  RATE_LIMIT_EXCEEDED = 88,
  INVALID_OR_EXPIRED_TOKEN = 89,
  UNABLE_TO_VERIFY_CREDENTIALS = 32,
  RESOURCE_NOT_FOUND = 34,
  NOT_AUTHORIZED = 87,
  ACCOUNT_SUSPENDED = 64,
  DUPLICATE_STATUS = 187,
  OVER_CAPACITY = 130,
  INTERNAL_ERROR = 131,
  MEDIA_ID_NOT_FOUND = 324,
  MEDIA_TYPE_NOT_SUPPORTED = 324,
  MEDIA_TOO_LARGE = 323,
  INVALID_MEDIA = 93,
  FORBIDDEN_CONTENT = 226,
}

/**
 * Twitter Error class for Twitter-specific errors
 */
export class TwitterError extends PlatformError {
  constructor(
    message: string,
    code: ApiErrorCode = ApiErrorCode.PLATFORM_ERROR,
    status: number = 502,
    originalError?: unknown,
    details?: Record<string, any>,
    recoverable: boolean = false,
    userId?: string,
  ) {
    super(
      Platform.TWITTER,
      message,
      code,
      status,
      originalError,
      details,
      recoverable,
      userId,
    );
  }

  /**
   * Parse a Twitter API error and convert it to our standardized error format
   * @param error The Twitter API error
   * @param userId Optional user ID associated with the error
   * @returns A TwitterError instance
   */
  static fromTwitterApiError(error: unknown, userId?: string): TwitterError {
    // Handle ApiRequestError (network/connection errors)
    if (error instanceof ApiRequestError) {
      return TwitterError.fromRequestError(error, userId);
    }

    // Handle ApiPartialResponseError (partial response errors)
    if (error instanceof ApiPartialResponseError) {
      return TwitterError.fromPartialResponseError(error, userId);
    }

    // Handle ApiResponseError (Twitter API response errors)
    if (error instanceof ApiResponseError) {
      return TwitterError.fromResponseError(error, userId);
    }

    // Handle generic errors
    if (error instanceof Error) {
      return new TwitterError(
        error.message,
        ApiErrorCode.UNKNOWN_ERROR,
        500,
        error,
        undefined,
        false,
        userId,
      );
    }

    // Handle unknown errors
    return new TwitterError(
      'Unknown Twitter API error',
      ApiErrorCode.UNKNOWN_ERROR,
      500,
      error,
      undefined,
      false,
      userId,
    );
  }

  /**
   * Parse a Twitter API request error
   * @param error The Twitter API request error
   * @param userId Optional user ID associated with the error
   * @returns A TwitterError instance
   */
  private static fromRequestError(error: ApiRequestError, userId?: string): TwitterError {
    return new TwitterError(
      `Twitter API request error: ${error.message}`,
      ApiErrorCode.NETWORK_ERROR,
      502,
      error,
      {
        requestError: error.requestError?.message,
      },
      true, // Network errors are typically recoverable
      userId,
    );
  }

  /**
   * Parse a Twitter API partial response error
   * @param error The Twitter API partial response error
   * @param userId Optional user ID associated with the error
   * @returns A TwitterError instance
   */
  private static fromPartialResponseError(
    error: ApiPartialResponseError,
    userId?: string,
  ): TwitterError {
    return new TwitterError(
      `Twitter API partial response error: ${error.message}`,
      ApiErrorCode.NETWORK_ERROR,
      502,
      error,
      {
        responseError: error.responseError?.message,
        rawContent: error.rawContent,
      },
      true, // Partial response errors are typically recoverable
      userId,
    );
  }

  /**
   * Parse a Twitter API response error
   * @param error The Twitter API response error
   * @param userId Optional user ID associated with the error
   * @returns A TwitterError instance
   */
  private static fromResponseError(error: ApiResponseError, userId?: string): TwitterError {
    // Extract Twitter error details
    const twitterErrors = error.errors || [];
    const firstError = twitterErrors[0];

    // Handle different error formats (V1 vs V2)
    // V1 errors have code and message properties
    // V2 errors have a different structure
    let twitterErrorCode: number | undefined;
    let twitterErrorMessage: string = error.message;

    if (firstError) {
      // Check if it's a V1 error (has code property)
      if ('code' in firstError && typeof firstError.code === 'number') {
        twitterErrorCode = firstError.code;
        twitterErrorMessage = firstError.message || error.message;
      } // For V2 errors, extract relevant information
      else if ('type' in firstError) {
        twitterErrorMessage = firstError.detail || firstError.title || error.message;
        // Map V2 error types to our error codes if needed
        // This is a simplified approach - expand as needed
      }
    }

    // Check for rate limit errors
    if (error.rateLimitError || twitterErrorCode === TwitterErrorCode.RATE_LIMIT_EXCEEDED) {
      return new TwitterError(
        `Twitter rate limit exceeded: ${twitterErrorMessage}`,
        ApiErrorCode.RATE_LIMITED,
        429,
        error,
        {
          twitterErrorCode,
          twitterMessage: twitterErrorMessage,
          rateLimit: error.rateLimit,
        },
        true, // Rate limit errors are recoverable
        userId,
      );
    }

    // Check for authentication errors
    if (
      error.isAuthError ||
      twitterErrorCode === TwitterErrorCode.INVALID_OR_EXPIRED_TOKEN ||
      twitterErrorCode === TwitterErrorCode.UNABLE_TO_VERIFY_CREDENTIALS ||
      twitterErrorCode === TwitterErrorCode.NOT_AUTHORIZED
    ) {
      return new TwitterError(
        `Twitter authentication error: ${twitterErrorMessage}`,
        ApiErrorCode.UNAUTHORIZED,
        401,
        error,
        {
          twitterErrorCode,
          twitterMessage: twitterErrorMessage,
        },
        true, // Auth errors may be recoverable with token refresh
        userId,
      );
    }

    // Check for duplicate content
    if (twitterErrorCode === TwitterErrorCode.DUPLICATE_STATUS) {
      return new TwitterError(
        `Duplicate content: ${twitterErrorMessage}`,
        ApiErrorCode.DUPLICATE_CONTENT,
        400,
        error,
        {
          twitterErrorCode,
          twitterMessage: twitterErrorMessage,
        },
        true, // Duplicate content can be fixed by modifying content
        userId,
      );
    }

    // Check for forbidden content
    if (twitterErrorCode === TwitterErrorCode.FORBIDDEN_CONTENT) {
      return new TwitterError(
        `Content policy violation: ${twitterErrorMessage}`,
        ApiErrorCode.CONTENT_POLICY_VIOLATION,
        400,
        error,
        {
          twitterErrorCode,
          twitterMessage: twitterErrorMessage,
        },
        false, // Content policy violations are not recoverable
        userId,
      );
    }

    // Check for resource not found
    if (twitterErrorCode === TwitterErrorCode.RESOURCE_NOT_FOUND) {
      return new TwitterError(
        `Resource not found: ${twitterErrorMessage}`,
        ApiErrorCode.NOT_FOUND,
        404,
        error,
        {
          twitterErrorCode,
          twitterMessage: twitterErrorMessage,
        },
        false, // Not found errors are not recoverable
        userId,
      );
    }

    // Check for account suspended
    if (twitterErrorCode === TwitterErrorCode.ACCOUNT_SUSPENDED) {
      return new TwitterError(
        `Account suspended: ${twitterErrorMessage}`,
        ApiErrorCode.FORBIDDEN,
        403,
        error,
        {
          twitterErrorCode,
          twitterMessage: twitterErrorMessage,
        },
        false, // Account suspension is not recoverable
        userId,
      );
    }

    // Check for media errors
    if (
      [
        TwitterErrorCode.MEDIA_ID_NOT_FOUND,
        TwitterErrorCode.MEDIA_TYPE_NOT_SUPPORTED,
        TwitterErrorCode.MEDIA_TOO_LARGE,
        TwitterErrorCode.INVALID_MEDIA,
      ].includes(twitterErrorCode as TwitterErrorCode)
    ) {
      return new TwitterError(
        `Media upload failed: ${twitterErrorMessage}`,
        ApiErrorCode.MEDIA_UPLOAD_FAILED,
        400,
        error,
        {
          twitterErrorCode,
          twitterMessage: twitterErrorMessage,
        },
        true, // Media errors may be recoverable by adjusting media
        userId,
      );
    }

    // Check for Twitter service errors
    if (
      [TwitterErrorCode.OVER_CAPACITY, TwitterErrorCode.INTERNAL_ERROR].includes(
        twitterErrorCode as TwitterErrorCode,
      )
    ) {
      return new TwitterError(
        `Twitter service error: ${twitterErrorMessage}`,
        ApiErrorCode.PLATFORM_UNAVAILABLE,
        503,
        error,
        {
          twitterErrorCode,
          twitterMessage: twitterErrorMessage,
        },
        true, // Service errors are typically recoverable
        userId,
      );
    }

    // Default case for other errors
    return new TwitterError(
      `Twitter API error: ${twitterErrorMessage}`,
      ApiErrorCode.PLATFORM_ERROR,
      error.code || 502,
      error,
      {
        twitterErrorCode,
        twitterMessage: twitterErrorMessage,
        twitterErrors: twitterErrors,
      },
      false, // Default to not recoverable
      userId,
    );
  }
}
