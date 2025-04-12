import { ApiError, ApiErrorCode, Platform, PlatformError } from '@crosspost/types';

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
