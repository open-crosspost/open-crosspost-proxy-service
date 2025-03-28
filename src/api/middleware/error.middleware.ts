import { ApiError, ErrorType } from '../../middleware/errors';
import { ApiResponseError, ApiRequestError, ApiPartialResponseError } from 'twitter-api-v2';
import { createErrorResponse } from '../../types/response.types';

/**
 * Error Middleware
 * Handles error processing and standardized error responses
 */
export class ErrorMiddleware {
  /**
   * Handle errors and return appropriate responses
   * @param error The error to handle
   * @returns Standardized error response
   */
  handleError(error: Error | ApiError | any): Response {
    console.error('Error:', error);

    // Default error response
    let status = 500;
    let errorType = ErrorType.INTERNAL;
    let errorMessage = 'An unexpected error occurred';
    let errorCode: string | undefined;
    let errorDetails: any;

    // Handle ApiError instances
    if (error instanceof ApiError) {
      status = error.status;
      errorType = error.type;
      errorMessage = error.message;
      errorCode = error.code;
      errorDetails = error.details;
    }
    // Handle Twitter API Request errors (network errors, bad URL, etc.)
    else if (error instanceof ApiRequestError) {
      status = 502; // Bad Gateway
      errorType = ErrorType.TWITTER_REQUEST;
      errorMessage = `Twitter API request failed: ${error.message}`;
      errorCode = 'REQUEST_FAILED';
      errorDetails = {
        requestError: error.requestError?.message,
        type: error.type,
      };
    }
    // Handle Twitter API Partial Response errors
    else if (error instanceof ApiPartialResponseError) {
      status = 502; // Bad Gateway
      errorType = ErrorType.TWITTER_PARTIAL_RESPONSE;
      errorMessage = `Twitter API partial response: ${error.message}`;
      errorCode = 'PARTIAL_RESPONSE';
      errorDetails = {
        responseError: error.responseError?.message,
        type: error.type,
        rawContent: error.rawContent?.toString().substring(0, 200) + '...',
      };
    }
    // Handle Twitter API Response errors (Twitter replies with an error)
    else if (error instanceof ApiResponseError) {
      // Determine appropriate status code
      if (error.rateLimitError) {
        status = 429; // Too Many Requests
        errorType = ErrorType.RATE_LIMIT;
      } else if (error.isAuthError) {
        status = 401; // Unauthorized
        errorType = ErrorType.AUTHENTICATION;
      } else {
        status = error.code || 502; // Use Twitter's code or default to Bad Gateway
        errorType = ErrorType.TWITTER_API;
      }

      errorMessage = error.message;
      errorCode = error.code?.toString();
      errorDetails = {
        errors: error.errors,
        rateLimit: error.rateLimit,
        type: error.type,
      };
    }
    // Handle other Twitter API errors (legacy handling)
    else if (error?.name === 'TwitterApiError') {
      status = error.status || 500;
      errorType = ErrorType.TWITTER_API;
      errorMessage = error.message;
      errorCode = error.code;
      errorDetails = error.data;
    }
    // Handle other errors
    else if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Create the error response
    const errorResponse = createErrorResponse(
      errorType,
      errorMessage,
      errorCode,
      errorDetails
    );

    // Return the error response
    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a middleware function that wraps a handler with error handling
   * @param handler The handler function to wrap
   * @returns Wrapped handler function with error handling
   */
  static withErrorHandling(handler: (request: Request, ...args: any[]) => Promise<Response>) {
    return async (request: Request, ...args: any[]): Promise<Response> => {
      try {
        return await handler(request, ...args);
      } catch (error) {
        return new ErrorMiddleware().handleError(error);
      }
    };
  }
}

/**
 * Common error factory methods
 */
export const Errors = {
  authentication: (message: string, code?: string) =>
    new ApiError(ErrorType.AUTHENTICATION, message, 401, code),

  authorization: (message: string, code?: string) =>
    new ApiError(ErrorType.AUTHORIZATION, message, 403, code),

  validation: (message: string, details?: any) =>
    new ApiError(ErrorType.VALIDATION, message, 400, undefined, details),

  rateLimit: (message: string, retryAfter?: number) =>
    new ApiError(
      ErrorType.RATE_LIMIT,
      message,
      429,
      undefined,
      { retryAfter }
    ),

  twitterApi: (message: string, code?: string, details?: any) =>
    new ApiError(ErrorType.TWITTER_API, message, 502, code, details),

  twitterRequest: (message: string, details?: any) =>
    new ApiError(ErrorType.TWITTER_REQUEST, message, 502, 'REQUEST_FAILED', details),

  twitterPartialResponse: (message: string, details?: any) =>
    new ApiError(ErrorType.TWITTER_PARTIAL_RESPONSE, message, 502, 'PARTIAL_RESPONSE', details),

  internal: (message: string) =>
    new ApiError(ErrorType.INTERNAL, message, 500),
};
