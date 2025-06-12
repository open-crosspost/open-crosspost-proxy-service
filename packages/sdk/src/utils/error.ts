import { ApiErrorCode, type ErrorDetails, type StatusCode } from '@crosspost/types';

/**
 * CrosspostError class for SDK error handling
 */
export class CrosspostError extends Error {
  readonly code: ApiErrorCode;
  readonly status: StatusCode;
  readonly details?: ErrorDetails;
  readonly recoverable: boolean;

  constructor(
    message: string,
    code: ApiErrorCode,
    status: StatusCode,
    details?: ErrorDetails,
    recoverable: boolean = false,
  ) {
    super(message);
    this.name = 'CrosspostError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.recoverable = recoverable;
  }

  /**
   * Get platform from details if available
   */
  get platform(): string | undefined {
    return this.details?.platform;
  }

  /**
   * Get userId from details if available
   */
  get userId(): string | undefined {
    return this.details?.userId;
  }
}

/**
 * Check if an error is a specific type based on its code
 */
function isErrorCode(error: unknown, codes: ApiErrorCode[]): boolean {
  return error instanceof CrosspostError && codes.includes(error.code);
}

/**
 * Check if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  return isErrorCode(error, [
    ApiErrorCode.UNAUTHORIZED,
    ApiErrorCode.FORBIDDEN,
  ]);
}

/**
 * Check if an error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  return isErrorCode(error, [
    ApiErrorCode.VALIDATION_ERROR,
    ApiErrorCode.INVALID_REQUEST,
  ]);
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return isErrorCode(error, [
    ApiErrorCode.NETWORK_ERROR,
    ApiErrorCode.PLATFORM_UNAVAILABLE,
  ]);
}

/**
 * Check if an error is a platform error
 */
export function isPlatformError(error: unknown): boolean {
  return error instanceof CrosspostError && !!error.details?.platform;
}

/**
 * Check if an error is a content policy error
 */
export function isContentError(error: unknown): boolean {
  return isErrorCode(error, [
    ApiErrorCode.CONTENT_POLICY_VIOLATION,
    ApiErrorCode.DUPLICATE_CONTENT,
  ]);
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  return isErrorCode(error, [ApiErrorCode.RATE_LIMITED]);
}

/**
 * Check if an error is a post-related error
 */
export function isPostError(error: unknown): boolean {
  return isErrorCode(error, [
    ApiErrorCode.POST_CREATION_FAILED,
    ApiErrorCode.THREAD_CREATION_FAILED,
    ApiErrorCode.POST_DELETION_FAILED,
    ApiErrorCode.POST_INTERACTION_FAILED,
  ]);
}

/**
 * Check if an error is a media-related error
 */
export function isMediaError(error: unknown): boolean {
  return isErrorCode(error, [ApiErrorCode.MEDIA_UPLOAD_FAILED]);
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  return error instanceof CrosspostError && error.recoverable;
}

/**
 * Get a user-friendly error message
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage: string = 'An error occurred',
): string {
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }
  return defaultMessage;
}

/**
 * Get error details if available
 */
export function getErrorDetails(error: unknown): ErrorDetails | undefined {
  if (error instanceof CrosspostError) {
    return error.details;
  }
  return undefined;
}

/**
 * Create a new error
 */
function createError(
  message: string,
  code: ApiErrorCode,
  status: StatusCode,
  details?: ErrorDetails,
  recoverable: boolean = false,
): CrosspostError {
  return new CrosspostError(
    message,
    code,
    status,
    details,
    recoverable,
  );
}

/**
 * Enrich an error with additional context
 */
export function enrichErrorWithContext(
  error: unknown,
  context: Record<string, unknown>,
): Error {
  if (error instanceof CrosspostError) {
    return createError(
      error.message,
      error.code,
      error.status,
      { ...(error.details || {}), ...context },
      error.recoverable,
    );
  }

  // For regular errors or non-Error objects, create a new CrosspostError
  const errorMessage = error instanceof Error ? error.message : String(error);
  return createError(
    errorMessage || 'An error occurred',
    ApiErrorCode.INTERNAL_ERROR,
    500,
    { originalError: error, ...context },
  );
}

/**
 * Handles error responses from the API and converts them to appropriate error objects.
 */
export function handleErrorResponse(
  data: any,
  status: number,
): CrosspostError {
  // Validate response format
  if (!data || typeof data !== 'object' || !('success' in data)) {
    return createError(
      'Invalid API response format',
      ApiErrorCode.INTERNAL_ERROR,
      status as StatusCode,
      { originalResponse: data },
    );
  }

  // Check for errors array
  if (!data.errors || !Array.isArray(data.errors) || data.errors.length === 0) {
    return createError(
      'Invalid error response format',
      ApiErrorCode.INTERNAL_ERROR,
      status as StatusCode,
      { originalResponse: data },
    );
  }

  // Handle single vs multiple errors
  if (data.errors.length === 1) {
    const errorDetail = data.errors[0];

    // Validate error detail structure
    if (!errorDetail.message || !errorDetail.code) {
      return createError(
        'Invalid error detail format',
        ApiErrorCode.INTERNAL_ERROR,
        status as StatusCode,
        { originalResponse: data },
      );
    }

    // Merge meta data from the API response with error details
    const finalDetails = {
      ...(errorDetail.details || {}),
      ...(data.meta || {}),
    };

    return createError(
      errorDetail.message,
      errorDetail.code as ApiErrorCode,
      status as StatusCode,
      finalDetails,
      errorDetail.recoverable ?? false,
    );
  } else {
    // Multiple errors - return first error with details about others
    const firstError = data.errors[0];
    return createError(
      'Multiple errors occurred',
      firstError.code as ApiErrorCode,
      status as StatusCode,
      {
        errors: data.errors,
        ...(data.meta || {}),
        originalResponse: data,
      },
      false,
    );
  }
}

/**
 * Creates a network error with appropriate details
 */
export function createNetworkError(error: unknown, url: string, timeout: number): CrosspostError {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return createError(
      `Request timed out after ${timeout}ms`,
      ApiErrorCode.NETWORK_ERROR,
      408,
      { url },
    );
  }

  return createError(
    error instanceof Error ? error.message : 'An unexpected error occurred during the request',
    ApiErrorCode.INTERNAL_ERROR,
    500,
    { originalError: String(error), url },
  );
}
