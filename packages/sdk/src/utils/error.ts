import { ApiError, ApiErrorCode, Platform, PlatformError } from '@crosspost/types';

/**
 * Error categories grouped by type
 */
export const ERROR_CATEGORIES = {
  AUTH: [
    ApiErrorCode.UNAUTHORIZED,
    ApiErrorCode.FORBIDDEN,
  ],
  VALIDATION: [
    ApiErrorCode.VALIDATION_ERROR,
    ApiErrorCode.INVALID_REQUEST,
  ],
  NETWORK: [
    ApiErrorCode.NETWORK_ERROR,
  ],
  PLATFORM: [
    ApiErrorCode.PLATFORM_ERROR,
    ApiErrorCode.PLATFORM_UNAVAILABLE,
  ],
  CONTENT: [
    ApiErrorCode.CONTENT_POLICY_VIOLATION,
    ApiErrorCode.DUPLICATE_CONTENT,
  ],
  RATE_LIMIT: [
    ApiErrorCode.RATE_LIMITED,
  ],
  POST: [
    ApiErrorCode.POST_CREATION_FAILED,
    ApiErrorCode.THREAD_CREATION_FAILED,
    ApiErrorCode.POST_DELETION_FAILED,
    ApiErrorCode.POST_INTERACTION_FAILED,
  ],
  MEDIA: [
    ApiErrorCode.MEDIA_UPLOAD_FAILED,
  ],
};

/**
 * Check if an error belongs to a specific category
 *
 * @param error The error to check
 * @param category The category to check against
 * @returns True if the error belongs to the category, false otherwise
 */
export function isErrorOfCategory(error: unknown, category: ApiErrorCode[]): boolean {
  if (error instanceof ApiError) {
    return category.includes(error.code);
  }

  if (error instanceof PlatformError) {
    return category.includes(error.code);
  }

  // Fallback for error-like objects with code property
  if (error && typeof error === 'object' && 'code' in error) {
    return category.includes((error as any).code);
  }

  return false;
}

/**
 * Check if an error is an authentication error
 *
 * @param error The error to check
 * @returns True if the error is an authentication error, false otherwise
 */
export function isAuthError(error: unknown): boolean {
  return isErrorOfCategory(error, ERROR_CATEGORIES.AUTH);
}

/**
 * Check if an error is a validation error
 *
 * @param error The error to check
 * @returns True if the error is a validation error, false otherwise
 */
export function isValidationError(error: unknown): boolean {
  return isErrorOfCategory(error, ERROR_CATEGORIES.VALIDATION);
}

/**
 * Check if an error is a network error
 *
 * @param error The error to check
 * @returns True if the error is a network error, false otherwise
 */
export function isNetworkError(error: unknown): boolean {
  return isErrorOfCategory(error, ERROR_CATEGORIES.NETWORK);
}

/**
 * Check if an error is a platform error
 *
 * @param error The error to check
 * @returns True if the error is a platform error, false otherwise
 */
export function isPlatformError(error: unknown): boolean {
  return isErrorOfCategory(error, ERROR_CATEGORIES.PLATFORM) || error instanceof PlatformError;
}

/**
 * Check if an error is a content policy error
 *
 * @param error The error to check
 * @returns True if the error is a content policy error, false otherwise
 */
export function isContentError(error: unknown): boolean {
  return isErrorOfCategory(error, ERROR_CATEGORIES.CONTENT);
}

/**
 * Check if an error is a rate limit error
 *
 * @param error The error to check
 * @returns True if the error is a rate limit error, false otherwise
 */
export function isRateLimitError(error: unknown): boolean {
  return isErrorOfCategory(error, ERROR_CATEGORIES.RATE_LIMIT);
}

/**
 * Check if an error is a post-related error
 *
 * @param error The error to check
 * @returns True if the error is a post-related error, false otherwise
 */
export function isPostError(error: unknown): boolean {
  return isErrorOfCategory(error, ERROR_CATEGORIES.POST);
}

/**
 * Check if an error is a media-related error
 *
 * @param error The error to check
 * @returns True if the error is a media-related error, false otherwise
 */
export function isMediaError(error: unknown): boolean {
  return isErrorOfCategory(error, ERROR_CATEGORIES.MEDIA);
}

/**
 * Check if an error is recoverable
 *
 * @param error The error to check
 * @returns True if the error is recoverable, false otherwise
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof ApiError || error instanceof PlatformError) {
    return error.recoverable;
  }

  return false;
}

/**
 * Get a user-friendly error message
 *
 * @param error The error to get the message from
 * @param defaultMessage The default message to return if no message is found
 * @returns The error message
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage: string = 'An error occurred',
): string {
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return (error as any).message || defaultMessage;
  }

  return defaultMessage;
}

/**
 * Extract error details if available
 *
 * @param error The error to extract details from
 * @returns The error details or undefined if none are found
 */
export function getErrorDetails(error: unknown): Record<string, any> | undefined {
  if (error instanceof ApiError || error instanceof PlatformError) {
    return error.details;
  }

  if (error && typeof error === 'object' && 'details' in error) {
    return (error as any).details;
  }

  return undefined;
}

/**
 * Enrich an error with additional context
 *
 * @param error The error to enrich
 * @param context The context to add to the error
 * @returns The enriched error
 */
export function enrichErrorWithContext(
  error: unknown,
  context: Record<string, any>,
): Error {
  if (error instanceof ApiError) {
    // Create a new ApiError with the merged details since details is read-only
    return new ApiError(
      error.message,
      error.code,
      error.status,
      { ...(error.details || {}), ...context },
      error.recoverable,
    );
  }

  if (error instanceof PlatformError) {
    // Create a new PlatformError with the merged details since details is read-only
    return new PlatformError(
      error.message,
      error.platform,
      error.code,
      error.recoverable,
      error.originalError,
      error.status,
      error.userId,
      { ...(error.details || {}), ...context },
    );
  }

  // For regular errors or non-Error objects, create a new ApiError with the context
  const errorMessage = error instanceof Error ? error.message : String(error);
  return new ApiError(
    errorMessage || 'An error occurred',
    ApiErrorCode.INTERNAL_ERROR,
    500,
    { originalError: error, ...context },
    false,
  );
}

/**
 * Wrapper for API calls with consistent error handling
 *
 * @param apiCall The API call to wrap
 * @param context Optional context to add to any errors
 * @returns The result of the API call
 * @throws An enriched error if the API call fails
 */
export async function apiWrapper<T>(
  apiCall: () => Promise<T>,
  context?: Record<string, any>,
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    // If it's a Response object, use handleErrorResponse
    if (error instanceof Response) {
      try {
        const errorData = await error.json();
        throw enrichErrorWithContext(
          handleErrorResponse(errorData, error.status),
          context || {},
        );
      } catch (jsonError) {
        // If JSON parsing fails, create a generic error
        if (jsonError instanceof Error && jsonError.name === 'SyntaxError') {
          throw enrichErrorWithContext(
            new ApiError(
              `API request failed with status ${error.status} and non-JSON response`,
              ApiErrorCode.NETWORK_ERROR,
              error.status as any,
              { originalResponse: error.statusText },
            ),
            context || {},
          );
        }
        // If it's already an enriched error from handleErrorResponse, just throw it
        throw jsonError;
      }
    }

    // If it's already an ApiError or PlatformError, just add context
    if (error instanceof ApiError || error instanceof PlatformError) {
      throw enrichErrorWithContext(error, context || {});
    }

    // Otherwise wrap it in an ApiError
    throw enrichErrorWithContext(
      error instanceof Error ? error : new Error(String(error)),
      context || {},
    );
  }
}

/**
 * Handles error responses from the API and converts them to appropriate error objects.
 *
 * @param data The error response data
 * @param status The HTTP status code
 * @returns An ApiError or PlatformError instance
 */
export function handleErrorResponse(data: any, status: number): ApiError | PlatformError {
  // Safely access nested error properties
  const errorData = data?.error || {};
  const message = errorData?.message || data?.message || 'An API error occurred';

  // Ensure code is a valid ApiErrorCode or default
  const codeString = errorData?.code || data?.code || ApiErrorCode.UNKNOWN_ERROR;
  const code = Object.values(ApiErrorCode).includes(codeString as ApiErrorCode)
    ? codeString as ApiErrorCode
    : ApiErrorCode.UNKNOWN_ERROR;

  const details = errorData?.details || data?.details || {};
  const recoverable = errorData?.recoverable ?? data?.recoverable ?? false;
  const platform = errorData?.platform || data?.platform;

  // Add original response data to details if not already present
  const enhancedDetails = { ...details };
  if (typeof enhancedDetails === 'object' && !enhancedDetails.originalResponse) {
    enhancedDetails.originalResponse = data; // Include the raw error payload for debugging
  }

  if (platform && Object.values(Platform).includes(platform as Platform)) {
    // If platform is specified and valid, it's a PlatformError
    return new PlatformError(
      message,
      platform as Platform,
      code, // Use the parsed code
      status as any, // Cast status
      enhancedDetails,
      recoverable,
    );
  } else {
    // Otherwise, it's a general ApiError
    return new ApiError(
      message,
      code, // Use the parsed code
      status as any, // Cast status
      enhancedDetails,
      recoverable,
    );
  }
}

/**
 * Creates a network error with appropriate details
 *
 * @param error The original error
 * @param url The request URL
 * @param timeout The request timeout
 * @returns An ApiError instance
 */
export function createNetworkError(error: unknown, url: string, timeout: number): ApiError {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError(
      `Request timed out after ${timeout}ms`,
      ApiErrorCode.NETWORK_ERROR,
      408,
      { url },
    );
  }

  return new ApiError(
    error instanceof Error ? error.message : 'An unexpected error occurred during the request',
    ApiErrorCode.INTERNAL_ERROR,
    500,
    { originalError: String(error), url },
  );
}
