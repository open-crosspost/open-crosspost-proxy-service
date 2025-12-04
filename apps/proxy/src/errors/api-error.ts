import type { ErrorDetails, StatusCode } from '@crosspost/types';
import { ApiErrorCode, errorCodeToStatusCode } from '@crosspost/types';

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: StatusCode;
  public readonly details?: ErrorDetails;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: ApiErrorCode,
    status: StatusCode,
    details?: ErrorDetails,
    recoverable: boolean = false,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.recoverable = recoverable;
  }
}

/**
 * Create an API error with the appropriate status code
 * @param code Error code that determines the HTTP status
 * @param message Optional message (defaults to code if not provided)
 * @param details Optional error details
 * @param recoverable Whether the error is recoverable
 */
export function createApiError(
  code: ApiErrorCode,
  message?: string,
  details?: ErrorDetails,
  recoverable: boolean = false,
): ApiError {
  const status = errorCodeToStatusCode[code];
  message = message || code;
  return new ApiError(message, code, status, details, recoverable);
}
