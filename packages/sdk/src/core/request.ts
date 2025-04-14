import { ApiError, ApiErrorCode } from '@crosspost/types';
import { createAuthToken, type NearAuthData } from 'near-sign-verify';
import { apiWrapper, createNetworkError, handleErrorResponse } from '../utils/error.ts';

/**
 * Options for making a request to the API
 */
export interface RequestOptions {
  /**
   * Base URL for the API
   */
  baseUrl: string;
  /**
   * NEAR authentication data for generating auth tokens
   * Can be undefined if not authorize yet
   */
  nearAuthData?: NearAuthData;
  /**
   * Request timeout in milliseconds
   */
  timeout: number;
  /**
   * Number of retries for failed requests
   */
  retries: number;
}

/**
 * Makes a request to the API with retry and error handling
 *
 * @param method The HTTP method
 * @param path The API path
 * @param options The request options
 * @param data Optional request data
 * @returns A promise resolving with the response data
 */
export async function makeRequest<T>(
  method: string,
  path: string,
  options: RequestOptions,
  data?: any,
  query?: Record<string, any>,
): Promise<T> {
  let url = `${options.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  // Add query parameters if provided
  if (query && Object.keys(query).length > 0) {
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    }
    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  // Check if authentication data is available
  if (!options.nearAuthData) {
    throw ApiError.unauthorized('Authentication required. Please provide NEAR signature.');
  }

  // Create a context object for error enrichment
  const context = {
    method,
    path,
    url,
    retries: options.retries,
  };

  return apiWrapper(async () => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= options.retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${createAuthToken(options.nearAuthData!)}`,
        };

        const requestOptions: RequestInit = {
          method,
          headers,
          body: method !== 'GET' && data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
        };

        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId); // Clear timeout if fetch completes

        let responseData: any;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          // If JSON parsing fails, throw a specific error or handle based on status
          if (!response.ok) {
            throw new ApiError(
              `API request failed with status ${response.status} and non-JSON response`,
              ApiErrorCode.NETWORK_ERROR,
              response.status as any,
              { originalStatusText: response.statusText },
            );
          }
          // If response was ok but JSON failed, maybe it was an empty 204 response?
          if (response.status === 204) return {} as T; // Handle No Content
          // Otherwise, throw a custom error
          throw new ApiError(
            `Failed to parse JSON response: ${
              jsonError instanceof Error ? jsonError.message : String(jsonError)
            }`,
            ApiErrorCode.INTERNAL_ERROR,
            response.status as any,
          );
        }

        if (!response.ok) {
          lastError = handleErrorResponse(responseData, response.status);
          // Retry only on 5xx errors or potentially recoverable errors if defined
          const shouldRetry = response.status >= 500 ||
            (lastError instanceof ApiError && lastError.recoverable);
          if (shouldRetry && attempt < options.retries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // Exponential backoff
            continue; // Retry
          }
          throw lastError; // Throw error if not retrying or retries exhausted
        }

        // Handle cases where API indicates failure within a 2xx response
        if (
          responseData && typeof responseData === 'object' && 'success' in responseData &&
          !responseData.success && responseData.error
        ) {
          lastError = handleErrorResponse(responseData, response.status);
          // Decide if this specific type of "successful" response with an error payload should be retried
          const shouldRetry = lastError instanceof ApiError && lastError.recoverable;
          if (shouldRetry && attempt < options.retries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // Exponential backoff
            continue; // Retry
          }
          throw lastError;
        }

        return responseData as T;
      } catch (error) {
        clearTimeout(timeoutId); // Clear timeout on error
        lastError = error instanceof Error ? error : new Error(String(error)); // Store the error

        // Handle fetch/network errors specifically for retries
        const isNetworkError = error instanceof TypeError ||
          (error instanceof DOMException && error.name === 'AbortError');
        if (isNetworkError && attempt < options.retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // Exponential backoff
          continue; // Retry network error
        }

        // If it's not a known ApiError/PlatformError, wrap it
        if (!(error instanceof ApiError)) {
          throw createNetworkError(error, url, options.timeout);
        }

        throw error; // Re-throw known ApiError or final network error
      }
    }

    // Should not be reachable if retries >= 0, but needed for type safety
    throw lastError ||
      new ApiError('Request failed after multiple retries', ApiErrorCode.INTERNAL_ERROR, 500);
  }, context);
}
