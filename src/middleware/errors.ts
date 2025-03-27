/**
 * Error handling middleware
 * This middleware catches errors and returns appropriate responses
 */
import { ApiPartialResponseError, ApiRequestError, ApiResponseError } from 'twitter-api-v2';

// Define error types
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  RATE_LIMIT = 'RATE_LIMIT',
  TWITTER_API = 'TWITTER_API',
  TWITTER_REQUEST = 'TWITTER_REQUEST',
  TWITTER_PARTIAL_RESPONSE = 'TWITTER_PARTIAL_RESPONSE',
  INTERNAL = 'INTERNAL',
}

// Define error response structure
export interface ErrorResponse {
  error: {
    type: ErrorType;
    message: string;
    code?: string;
    details?: any;
  };
}

// Custom error class
export class ApiError extends Error {
  type: ErrorType;
  code?: string;
  details?: any;
  status: number;

  constructor(
    type: ErrorType,
    message: string,
    status = 500,
    code?: string,
    details?: any
  ) {
    super(message);
    this.type = type;
    this.code = code;
    this.details = details;
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Handle errors and return appropriate responses
 */
export const handleErrors = (error: Error | ApiError | any): Response => {
  console.error('Error:', error);

  // Default error response
  let status = 500;
  let errorResponse: ErrorResponse = {
    error: {
      type: ErrorType.INTERNAL,
      message: 'An unexpected error occurred',
    },
  };

  // Handle ApiError instances
  if (error instanceof ApiError) {
    status = error.status;
    errorResponse = {
      error: {
        type: error.type,
        message: error.message,
        code: error.code,
        details: error.details,
      },
    };
  }
  // Handle Twitter API Request errors (network errors, bad URL, etc.)
  else if (error instanceof ApiRequestError) {
    status = 502; // Bad Gateway
    errorResponse = {
      error: {
        type: ErrorType.TWITTER_REQUEST,
        message: `Twitter API request failed: ${error.message}`,
        code: 'REQUEST_FAILED',
        details: {
          requestError: error.requestError?.message,
          type: error.type,
        },
      },
    };
  }
  // Handle Twitter API Partial Response errors
  else if (error instanceof ApiPartialResponseError) {
    status = 502; // Bad Gateway
    errorResponse = {
      error: {
        type: ErrorType.TWITTER_PARTIAL_RESPONSE,
        message: `Twitter API partial response: ${error.message}`,
        code: 'PARTIAL_RESPONSE',
        details: {
          responseError: error.responseError?.message,
          type: error.type,
          rawContent: error.rawContent?.toString().substring(0, 200) + '...',
        },
      },
    };
  }
  // Handle Twitter API Response errors (Twitter replies with an error)
  else if (error instanceof ApiResponseError) {
    // Determine appropriate status code
    if (error.rateLimitError) {
      status = 429; // Too Many Requests
    } else if (error.isAuthError) {
      status = 401; // Unauthorized
    } else {
      status = error.code || 502; // Use Twitter's code or default to Bad Gateway
    }

    // Create detailed error response
    errorResponse = {
      error: {
        type: error.rateLimitError ? ErrorType.RATE_LIMIT :
          error.isAuthError ? ErrorType.AUTHENTICATION :
            ErrorType.TWITTER_API,
        message: error.message,
        code: error.code?.toString(),
        details: {
          errors: error.errors,
          rateLimit: error.rateLimit,
          type: error.type,
        },
      },
    };
  }
  // Handle other Twitter API errors (legacy handling)
  else if (error?.name === 'TwitterApiError') {
    status = error.status || 500;
    errorResponse = {
      error: {
        type: ErrorType.TWITTER_API,
        message: error.message,
        code: error.code,
        details: error.data,
      },
    };
  }
  // Handle other errors
  else if (error instanceof Error) {
    errorResponse = {
      error: {
        type: ErrorType.INTERNAL,
        message: error.message,
      },
    };
  }

  // Return the error response
  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

/**
 * Create common error instances
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
