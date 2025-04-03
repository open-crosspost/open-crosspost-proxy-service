import { ApiErrorCode } from '../common.ts';
import { BaseError } from './base-error.ts';

/**
 * API Error class for application-level errors
 */
export class ApiError extends BaseError {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, any>;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: ApiErrorCode = ApiErrorCode.INTERNAL_ERROR,
    status: number = 500,
    details?: Record<string, any>,
    recoverable: boolean = false,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.recoverable = recoverable;
  }

  /**
   * Create a validation error
   */
  static validation(message: string, details?: Record<string, any>): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.VALIDATION_ERROR,
      400,
      details,
      true,
    );
  }

  /**
   * Create an unauthorized error
   */
  static unauthorized(message: string = 'Unauthorized'): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.UNAUTHORIZED,
      401,
      undefined,
      true,
    );
  }

  /**
   * Create a forbidden error
   */
  static forbidden(message: string = 'Forbidden'): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.FORBIDDEN,
      403,
      undefined,
      false,
    );
  }

  /**
   * Create a not found error
   */
  static notFound(message: string = 'Resource not found'): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.NOT_FOUND,
      404,
      undefined,
      false,
    );
  }

  /**
   * Create a rate limit error
   */
  static rateLimited(
    message: string = 'Rate limit exceeded',
    details?: Record<string, any>,
  ): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.RATE_LIMITED,
      429,
      details,
      true,
    );
  }

  /**
   * Create an internal server error
   */
  static internal(
    message: string = 'Internal server error',
    details?: Record<string, any>,
  ): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.INTERNAL_ERROR,
      500,
      details,
      false,
    );
  }
}
