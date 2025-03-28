/**
 * Error Types
 * Defines the types of errors that can occur in the application
 */
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  INTERNAL = 'INTERNAL',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_API = 'EXTERNAL_API',
  TWITTER_API = 'TWITTER_API',
  TWITTER_REQUEST = 'TWITTER_REQUEST',
  TWITTER_PARTIAL_RESPONSE = 'TWITTER_PARTIAL_RESPONSE',
}

/**
 * Error Codes
 * Defines specific error codes for different error scenarios
 */
export enum ErrorCode {
  // Authentication errors
  MISSING_NEAR_AUTH_HEADERS = 'MISSING_NEAR_AUTH_HEADERS',
  INVALID_NEAR_AUTH = 'INVALID_NEAR_AUTH',
  NEAR_AUTH_VALIDATION_ERROR = 'NEAR_AUTH_VALIDATION_ERROR',
  MISSING_NEAR_AUTH = 'MISSING_NEAR_AUTH',
  
  // Authorization errors
  INSUFFICIENT_PERMISSION = 'INSUFFICIENT_PERMISSION',
  
  // Validation errors
  MISSING_USER_ID = 'MISSING_USER_ID',
  INVALID_REQUEST_BODY = 'INVALID_REQUEST_BODY',
  
  // Internal errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  
  // Not found errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // Rate limit errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // External API errors
  TWITTER_API_ERROR = 'TWITTER_API_ERROR',
}

/**
 * Error Response
 * Defines the structure of an error response
 */
export interface ErrorResponse {
  type: ErrorType;
  message: string;
  code: string;
  details?: any;
}

/**
 * API Error class
 * Custom error class for API errors
 */
export class ApiError extends Error {
  /**
   * Create a new API error
   * @param type Error type
   * @param message Error message
   * @param status HTTP status code
   * @param code Error code
   * @param details Additional error details
   */
  constructor(
    public readonly type: ErrorType,
    message: string,
    public readonly status: number = 500,
    public readonly code?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Errors
 * Defines standard error objects for different error scenarios
 */
export const Errors = {
  // Authentication errors
  missingNearAuthHeaders: {
    type: ErrorType.AUTHENTICATION,
    message: 'NEAR authentication headers are required',
    code: ErrorCode.MISSING_NEAR_AUTH_HEADERS,
  },
  invalidNearAuth: {
    type: ErrorType.AUTHENTICATION,
    message: 'Invalid NEAR authentication',
    code: ErrorCode.INVALID_NEAR_AUTH,
  },
  nearAuthValidationError: {
    type: ErrorType.AUTHENTICATION,
    message: 'Error validating NEAR authentication',
    code: ErrorCode.NEAR_AUTH_VALIDATION_ERROR,
  },
  missingNearAuth: {
    type: ErrorType.AUTHENTICATION,
    message: 'NEAR authentication is required',
    code: ErrorCode.MISSING_NEAR_AUTH,
  },
  
  // Authorization errors
  insufficientPermission: (permission: string) => ({
    type: ErrorType.AUTHORIZATION,
    message: `Missing required permission: ${permission}`,
    code: ErrorCode.INSUFFICIENT_PERMISSION,
  }),
  
  // Validation errors
  missingUserId: {
    type: ErrorType.VALIDATION,
    message: 'User ID is required',
    code: ErrorCode.MISSING_USER_ID,
  },
  invalidRequestBody: (details?: any) => ({
    type: ErrorType.VALIDATION,
    message: 'Invalid request body',
    code: ErrorCode.INVALID_REQUEST_BODY,
    details,
  }),
  
  // Internal errors
  internalServerError: (message?: string) => ({
    type: ErrorType.INTERNAL,
    message: message || 'An internal server error occurred',
    code: ErrorCode.INTERNAL_SERVER_ERROR,
  }),
  
  // Not found errors
  resourceNotFound: (resource?: string) => ({
    type: ErrorType.NOT_FOUND,
    message: resource ? `${resource} not found` : 'Resource not found',
    code: ErrorCode.RESOURCE_NOT_FOUND,
  }),
  
  // Rate limit errors
  rateLimitExceeded: (endpoint?: string) => ({
    type: ErrorType.RATE_LIMIT,
    message: endpoint ? `Rate limit exceeded for ${endpoint}` : 'Rate limit exceeded',
    code: ErrorCode.RATE_LIMIT_EXCEEDED,
  }),
  
  // External API errors
  twitterApiError: (message?: string) => ({
    type: ErrorType.EXTERNAL_API,
    message: message || 'Twitter API error',
    code: ErrorCode.TWITTER_API_ERROR,
  }),
};
