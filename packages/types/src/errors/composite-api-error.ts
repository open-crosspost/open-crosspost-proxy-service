import { ApiError, ApiErrorCode } from './api-error.ts';
import type { ErrorDetail } from '../response.ts';
import type { StatusCode } from 'hono/utils/http-status';

/**
 * CompositeApiError represents a collection of multiple errors that occurred during an API operation.
 * This is particularly useful for handling multi-status responses (HTTP 207) where multiple operations
 * may have different outcomes.
 */
export class CompositeApiError extends ApiError {
  /**
   * Array of individual error details
   */
  readonly errors: ErrorDetail[];

  constructor(
    message: string,
    errors: ErrorDetail[],
    status: StatusCode = 207,
    details?: Record<string, any>,
    recoverable: boolean = false,
  ) {
    super(
      message,
      ApiErrorCode.MULTI_STATUS,
      status,
      { ...details, errors },
      recoverable,
    );

    this.errors = errors;
  }
}
