import { ApiErrorCode } from '@crosspost/types';

/**
 * Maps CrosspostError codes to appropriate error messages
 * Used by service to transform API errors
 */
export function mapToCrosspostError(
  responseData: any,
  statusCode: number,
): Error {
  const errors = responseData.errors || [];
  const primaryError = errors[0] || {};

  const message = primaryError.message || `Request failed with status ${statusCode}`;
  const code = primaryError.code || ApiErrorCode.UNKNOWN_ERROR;

  // Create Error with additional context
  const error = new Error(message);
  (error as any).code = code;
  (error as any).statusCode = statusCode;
  (error as any).details = primaryError.details;
  (error as any).recoverable = primaryError.recoverable;

  return error;
}

/**
 * Maps HTTP status codes to user-friendly error messages
 */
export function getStatusErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad request - please check your input parameters';
    case 401:
      return 'Authentication failed - please check your credentials';
    case 403:
      return 'Access forbidden - insufficient permissions';
    case 404:
      return 'Resource not found';
    case 429:
      return 'Rate limit exceeded - please try again later';
    case 500:
      return 'Internal server error - please try again later';
    case 502:
      return 'Bad gateway - service temporarily unavailable';
    case 503:
      return 'Service unavailable - please try again later';
    default:
      return `Request failed with status ${statusCode}`;
  }
}
