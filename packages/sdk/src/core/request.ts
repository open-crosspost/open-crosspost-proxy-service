import { ApiErrorCode, type StatusCode } from '@crosspost/types';
import { createAuthToken, type NearAuthData } from 'near-sign-verify';
import {
  apiWrapper,
  createNetworkError,
  CrosspostError,
  handleErrorResponse,
} from '../utils/error.ts';

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
   * Required for non-GET requests, optional for GET requests
   */
  nearAuthData?: NearAuthData;
  /**
   * NEAR account ID for simplified GET request authentication
   * If not provided, will use account_id from nearAuthData
   */
  nearAccount?: string;
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
export async function makeRequest<
  TResponse,
  TRequest = unknown,
  TQuery = unknown,
>(
  method: string,
  path: string,
  options: RequestOptions,
  data?: TRequest,
  query?: TQuery,
): Promise<TResponse> {
  let url = `${options.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  // Add query parameters if provided
  if (query && typeof query === 'object' && Object.keys(query).length > 0) {
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
        };

        // For GET requests, use X-Near-Account header if available
        if (method === 'GET') {
          const nearAccount = options.nearAccount || options.nearAuthData?.account_id;
          if (!nearAccount) {
            throw new CrosspostError(
              'No NEAR account provided for GET request',
              ApiErrorCode.UNAUTHORIZED,
              401,
            );
          }
          headers['X-Near-Account'] = nearAccount;
        } else {
          // For non-GET requests, require nearAuthData
          if (!options.nearAuthData) {
            throw new CrosspostError(
              'NEAR authentication data required for non-GET request',
              ApiErrorCode.UNAUTHORIZED,
              401,
            );
          }
          headers['Authorization'] = `Bearer ${createAuthToken(options.nearAuthData)}`;
        }

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
          // If JSON parsing fails, did API throw an error?
          if (!response.ok) {
            throw new CrosspostError(
              `API request failed with status ${response.status} and non-JSON response`,
              ApiErrorCode.NETWORK_ERROR,
              response.status as StatusCode,
              { originalStatusText: response.statusText },
            );
          }
          // Otherwise, throw a custom error
          throw new CrosspostError(
            `Failed to parse JSON response: ${
              jsonError instanceof Error ? jsonError.message : String(jsonError)
            }`,
            ApiErrorCode.INTERNAL_ERROR,
            response.status as StatusCode,
          );
        }

        if (!response.ok) {
          lastError = handleErrorResponse(responseData, response.status);
          // Only retry rate limit errors
          const shouldRetry = lastError instanceof CrosspostError &&
            lastError.code === ApiErrorCode.RATE_LIMITED;
          if (shouldRetry && attempt < options.retries) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // Exponential backoff
            continue; // Retry
          }
          throw lastError; // Throw error if not retrying or retries exhausted
        }

        // Handle response based on success flag
        if (responseData && typeof responseData === 'object' && 'success' in responseData) {
          if (responseData.success) {
            // Success response - return the data
            return responseData.data as TResponse;
          } else {
            // Error response - handle with our error utilities
            lastError = handleErrorResponse(responseData, response.status);
            // Only retry rate limit errors
            const shouldRetry = lastError instanceof CrosspostError &&
              lastError.code === ApiErrorCode.RATE_LIMITED;
            if (shouldRetry && attempt < options.retries) {
              await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // Exponential backoff
              continue; // Retry
            }
            throw lastError;
          }
        }
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
        if (!(error instanceof CrosspostError)) {
          throw createNetworkError(error, url, options.timeout);
        }

        throw error; // Re-throw known ApiError or final network error
      }
    }

    // Should not be reachable if retries >= 0, but needed for type safety
    throw lastError ||
      new CrosspostError('Request failed after multiple retries', ApiErrorCode.INTERNAL_ERROR, 500);
  }, context);
}
