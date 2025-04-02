/**
 * Error types for the Crosspost SDK
 */

import { ApiErrorCode } from '@crosspost/types';

/**
 * Base error class for all SDK errors
 */
export class CrosspostError extends Error {
  /**
   * Error code
   */
  public readonly code: ApiErrorCode;

  /**
   * HTTP status code (if applicable)
   */
  public readonly status?: number;

  /**
   * Additional error details
   */
  public readonly details?: Record<string, any>;

  /**
   * Whether the error is recoverable (can be retried)
   */
  public readonly recoverable: boolean;

  /**
   * Constructor
   * @param message Error message
   * @param code Error code
   * @param status HTTP status code (if applicable)
   * @param details Additional error details
   * @param recoverable Whether the error is recoverable (can be retried)
   */
  constructor(
    message: string,
    code: ApiErrorCode = ApiErrorCode.UNKNOWN_ERROR,
    status?: number,
    details?: Record<string, any>,
    recoverable: boolean = false,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
    this.recoverable = recoverable;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Create a network error
   * @param message Error message
   * @param details Additional error details
   * @returns Network error
   */
  static network(message: string = 'Network error', details?: Record<string, any>): CrosspostError {
    return new CrosspostError(
      message,
      ApiErrorCode.NETWORK_ERROR,
      undefined,
      details,
      true, // Network errors are typically recoverable
    );
  }

  /**
   * Create an authentication error
   * @param message Error message
   * @param details Additional error details
   * @returns Authentication error
   */
  static authentication(
    message: string = 'Authentication failed',
    details?: Record<string, any>,
  ): CrosspostError {
    return new CrosspostError(
      message,
      ApiErrorCode.UNAUTHORIZED,
      401,
      details,
      true, // Authentication errors may be recoverable (e.g., by refreshing tokens)
    );
  }

  /**
   * Create a rate limit error
   * @param message Error message
   * @param details Additional error details
   * @returns Rate limit error
   */
  static rateLimit(
    message: string = 'Rate limit exceeded',
    details?: Record<string, any>,
  ): CrosspostError {
    return new CrosspostError(
      message,
      ApiErrorCode.RATE_LIMITED,
      429,
      details,
      true, // Rate limit errors are recoverable (by waiting)
    );
  }

  /**
   * Create a validation error
   * @param message Error message
   * @param details Additional error details
   * @returns Validation error
   */
  static validation(
    message: string = 'Validation failed',
    details?: Record<string, any>,
  ): CrosspostError {
    return new CrosspostError(
      message,
      ApiErrorCode.VALIDATION_ERROR,
      400,
      details,
      false, // Validation errors are not typically recoverable without changing the request
    );
  }

  /**
   * Create a platform error
   * @param message Error message
   * @param details Additional error details
   * @returns Platform error
   */
  static platform(
    message: string = 'Platform error',
    details?: Record<string, any>,
  ): CrosspostError {
    return new CrosspostError(
      message,
      ApiErrorCode.PLATFORM_ERROR,
      502,
      details,
      false, // Platform errors are not typically recoverable
    );
  }
}
