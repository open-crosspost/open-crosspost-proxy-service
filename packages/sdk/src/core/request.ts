import retry from 'async-retry';
import { ApiErrorCode, type ApiResponse, type StatusCode } from '@crosspost/types';
import {
  createNetworkError,
  CrosspostError,
  enrichErrorWithContext,
  handleErrorResponse,
} from '../utils/error.ts';

/**
 * Options for making a request to the API
 */
export interface RequestOptions {
  /**
   * Base URL for the API
   */
  baseUrl: URL;
  /**
   * Auth token from near-sign-verify
   */
  authToken?: string;
  /**
   * NEAR account ID for simple GET request authentication
   */
  accountId?: string;
  /**
   * Request timeout in milliseconds
   */
  timeout: number;
}

/**
 * Makes a request to the API with error handling and data extraction
 *
 * @param method The HTTP method
 * @param path The API path
 * @param options The request options
 * @param data Optional request data
 * @param query Optional query parameters
 * @returns A promise resolving with the API response object
 * @throws {CrosspostError}
 *  - If the request fails (network error, timeout)
 *  - If the response is not valid JSON
 *  - If the response does not follow the expected ApiResponse format
 *  - If the response indicates success but contains no data
 *  - If the response indicates failure (includes error details and metadata)
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
): Promise<ApiResponse<TResponse>> {
  const url = new URL(path, options.baseUrl);

  // Add query parameters if provided
  if (query && typeof query === 'object' && Object.keys(query).length > 0) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    }
  }

  // Create a context object for error enrichment
  const context = {
    method,
    path,
    url,
  };

  return retry(
    async (bail, _attemptNumber) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };

        // For GET requests, use X-Near-Account header if available
        if (method === 'GET') {
          const accountId = options.accountId;
          if (!accountId) {
            throw new CrosspostError(
              'No NEAR account provided for GET request',
              ApiErrorCode.UNAUTHORIZED,
              401,
            );
          }
          headers['X-Near-Account'] = accountId;
        } else {
          // For non-GET requests, require authToken
          if (!options.authToken) {
            throw new CrosspostError(
              'Auth token required for non-GET request',
              ApiErrorCode.UNAUTHORIZED,
              401,
            );
          }
          headers['Authorization'] = `Bearer ${options.authToken}`;
        }

        const requestOptions: RequestInit = {
          method,
          headers,
          body: method !== 'GET' && data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
        };

        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        let responseData: ApiResponse<TResponse>;
        try {
          responseData = await response.json();
        } catch (jsonError) {
          // JSON parsing failed - try to get response text for context
          let responseText: string | undefined;
          try {
            responseText = await response.text();
          } catch (_) { /* ignore */ }

          throw new CrosspostError(
            `API request failed with status ${response.status} and non-JSON response`,
            ApiErrorCode.INVALID_RESPONSE,
            response.status as StatusCode,
            {
              originalStatusText: response.statusText,
              originalError: jsonError instanceof Error ? jsonError.message : String(jsonError),
              responseText,
            },
          );
        }

        // Handle non-ok responses (4xx/5xx)
        if (!response.ok) {
          throw handleErrorResponse(responseData, response.status);
        }

        // Validate success response structure
        if (
          !responseData || typeof responseData !== 'object' || !('success' in responseData) ||
          !('meta' in responseData)
        ) {
          throw new CrosspostError(
            'Invalid response format from API',
            ApiErrorCode.INVALID_RESPONSE,
            response.status as StatusCode,
            { responseData },
          );
        }

        if (responseData.success) {
          return responseData as ApiResponse<TResponse>;
        }

        // If we get here, we have response.ok but success: false
        // This is unexpected - treat as an error
        throw handleErrorResponse(responseData, response.status);
      } catch (error) {
        clearTimeout(timeoutId);

        // Check if the error is one we want to retry on
        if (
          error instanceof TypeError ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          // If it's a retryable error, async-retry will handle the retry.
          // Re-throw it here so async-retry knows the attempt failed.
          throw error;
        }

        // If it's not a retryable error, or if retries are exhausted,
        // enrich and bail out of retries.
        if (error instanceof CrosspostError) {
          // Enrich CrosspostError with request context and bail
          const enrichedError = enrichErrorWithContext(error, context);
          bail(enrichedError); // bail will throw this error
          throw enrichedError; // Redundant but satisfies some linters/type checkers
        }

        if (
          error instanceof TypeError ||
          (error instanceof DOMException && error.name === 'AbortError')
        ) {
          const networkError = createNetworkError(error, url.toString(), options.timeout);
          const enrichedNetworkError = enrichErrorWithContext(networkError, context);
          bail(enrichedNetworkError);
          throw enrichedNetworkError;
        }

        // For any other non-retryable errors, wrap them, enrich, and bail
        const wrappedError = new CrosspostError(
          error instanceof Error ? error.message : String(error),
          ApiErrorCode.INTERNAL_ERROR,
          500,
          { originalError: String(error) },
        );
        const enrichedWrappedError = enrichErrorWithContext(wrappedError, context);
        bail(enrichedWrappedError); // bail will throw this error
        throw enrichedWrappedError; // Redundant
      }
    },
    {
      retries: 3,
      factor: 1,
      minTimeout: 1000,
      maxTimeout: 1000,
      onRetry: (error, attempt) => {
        console.warn(
          `Attempt ${attempt} failed for ${context.method} ${context.path}: ${
            (error instanceof Error) ? error.message : 'Unknown error'
          }. Retrying...`,
        );
      },
    },
  );
}
