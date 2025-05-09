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

  private static extractTwitterErrorInfo(error: any) {
    const errorInfo: Record<string, any> = {};
    
    if (error && typeof error === 'object') {
      // Extract Twitter errors array
      if ('errors' in error && Array.isArray(error.errors)) {
        // Create a concise error message from Twitter errors
        errorInfo.message = error.errors.map((e: any) => 
          e.message || e.detail || (e.code ? `Error code ${e.code}` : '')
        ).filter(Boolean).join('; ');
      }
      
      // Extract rate limit info
      if ('rateLimit' in error) {
        errorInfo.rateLimit = error.rateLimit;
      }
      
      // Extract transaction ID
      if (error.headers && 'x-transaction-id' in error.headers) {
        errorInfo.transactionId = error.headers['x-transaction-id'];
      }
    }
    
    return errorInfo;
  }

  private static fromRequestError(error: ApiRequestError): TwitterError {
    const errorMessage = error.requestError instanceof Error
      ? error.requestError.message
      : String(error.requestError || error.message);
    
    const details = {
      platformErrorCode: 502,
      platformMessage: errorMessage,
      platformErrorType: error.type,
      originalError: error,
      error: error.error,
      type: error.type,
      request: error.request,
      requestError: error.requestError instanceof Error ? 
        { message: error.requestError.message, name: error.requestError.name } : 
        error.requestError,
    };

    return new TwitterError(
      `Twitter API request error: ${errorMessage}`,
      ApiErrorCode.NETWORK_ERROR,
      sanitizeErrorDetails(details),
      true
    );
  }

  private static fromPartialResponseError(
    error: ApiPartialResponseError,
  ): TwitterError {
    const errorMessage = error.responseError instanceof Error
      ? error.responseError.message
      : String(error.responseError || error.message);
    
    const details = {
      platformErrorCode: 502,
      platformMessage: errorMessage,
      platformErrorType: error.type,
      originalError: error,
      error: error.error,
      type: error.type,
      request: error.request,
      responseError: error.responseError instanceof Error ? 
        { message: error.responseError.message, name: error.responseError.name } : 
        error.responseError,
      rawContentSample: error.rawContent ? 
        (typeof error.rawContent === 'string' ? 
          error.rawContent.substring(0, 200) : 
          'Binary content') : 
        undefined,
      response: error.response,
    };

    return new TwitterError(
      `Twitter API partial response error: ${errorMessage}`,
      ApiErrorCode.NETWORK_ERROR,
      sanitizeErrorDetails(details),
      true
    );
  }

  private static fromResponseError(error: ApiResponseError): TwitterError {
    const errorMessage = error.message;
    const twitterErrors = error.errors || [];
    const errorInfo = TwitterError.extractTwitterErrorInfo(error);
    
    // Format Twitter errors for better readability
    const formattedTwitterErrors = twitterErrors.map(e => {
      if (typeof e === 'object' && e !== null) {
        return {
          code: 'code' in e ? e.code : undefined,
          message: 'message' in e ? e.message : ('detail' in e ? e.detail : undefined),
          parameter: 'parameter' in e ? e.parameter : undefined,
          type: 'type' in e ? e.type : undefined
        };
      }
      return e;
    });
    
    // Create base error details
    const details: ErrorDetails = sanitizeErrorDetails({
      platformErrorCode: error.code || 500,
      platformMessage: errorMessage,
      platformErrorType: error.type,
      platformErrors: formattedTwitterErrors,
      transactionId: errorInfo.transactionId,
      originalError: error,
      error: error.error,
      type: error.type,
      request: error.request,
      data: error.data ? JSON.stringify(error.data).substring(0, 500) : undefined,
      headers: error.headers,
      response: error.response,
      errors: formattedTwitterErrors,
    });

    // Handle rate limit errors
    if (error.rateLimitError) {
      details.rateLimit = error.rateLimit;
      return new TwitterError(
        `Twitter rate limit exceeded: ${errorInfo.message || errorMessage}`,
        ApiErrorCode.RATE_LIMITED,
        details,
        true
      );
    }

    // Handle auth errors
    if (error.isAuthError) {
      return new TwitterError(
        `Twitter authentication error: ${errorInfo.message || errorMessage}`,
        ApiErrorCode.UNAUTHORIZED,
        details,
        true
      );
    }

    // Handle duplicate content errors
    if (error.errors?.some((e) => 'code' in e && e.code === 187)) {
      return new TwitterError(
        `Duplicate content: ${errorInfo.message || errorMessage}`,
        ApiErrorCode.DUPLICATE_CONTENT,
        details,
        false
      );
    }

    // Get a clean error message from Twitter errors if available
    const cleanErrorMessage = errorInfo.message || 
      (twitterErrors.length > 0 ? 
        twitterErrors.map(e => {
          if (typeof e === 'object' && e !== null) {
            return 'message' in e ? e.message : ('detail' in e ? e.detail : null);
          }
          return null;
        }).filter(Boolean).join('; ') : 
        errorMessage);

    // Handle other errors based on status code
    switch (error.code) {
      case 404:
        return new TwitterError(
          `Resource not found: ${cleanErrorMessage}`,
          ApiErrorCode.NOT_FOUND,
          details,
          false
        );
      case 403:
        return new TwitterError(
          `Access forbidden: ${cleanErrorMessage}`,
          ApiErrorCode.FORBIDDEN,
          details,
          false
        );
      case 400:
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
            false
          );
        }
        return new TwitterError(
          `Invalid request: ${cleanErrorMessage}`,
          ApiErrorCode.INVALID_REQUEST,
          details,
          false
        );
      case 503:
        return new TwitterError(
          `Twitter service unavailable: ${cleanErrorMessage}`,
          ApiErrorCode.PLATFORM_UNAVAILABLE,
          details,
          true
        );
      default:
        return new TwitterError(
          `Twitter API error: ${cleanErrorMessage}`,
          ApiErrorCode.PLATFORM_ERROR,
          details,
          false
        );
    }
  }
}
