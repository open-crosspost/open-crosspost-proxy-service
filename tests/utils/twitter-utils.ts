import {
  ApiResponseError,
  ApiRequestError,
  ApiPartialResponseError,
} from 'twitter-api-v2'; // Import the actual error types

/**
 * Error type to mock
 */
export enum TwitterMockErrorType {
  RESPONSE_ERROR = 'response',
  REQUEST_ERROR = 'request',
  PARTIAL_RESPONSE_ERROR = 'partial',
  NETWORK_ERROR = 'network',
}

/**
 * Create a mock error response from Twitter API
 * @param code Twitter error code
 * @param message Error message
 * @param errorType Type of error to mock (default: response)
 * @param title Optional title for V2 errors
 * @param type Optional type for V2 errors
 * @param detail Optional detail for V2 errors
 * @returns Mock Twitter API error
 */
export function createMockTwitterError(
  code: number,
  message: string,
  errorType: TwitterMockErrorType = TwitterMockErrorType.RESPONSE_ERROR,
  title?: string,
  type?: string,
  detail?: string,
): any {
  switch (errorType) {
    case TwitterMockErrorType.RESPONSE_ERROR: {
      const mockError = {
        message: message,
        name: 'ApiResponseError',
        code: code,
        data: { errors: [{ code, message }] },
        type: 'response',
        rateLimitError: code === 88,
        isAuthError: [89, 32, 87].includes(code),
        request: {
          method: 'POST',
          url: 'https://api.twitter.com/2/tweets',
          headers: {},
          data: {},
        },
        response: {
          status: code,
          statusText: message,
          headers: {},
          data: { errors: [{ code, message }] },
        },
        headers: {},
        error: true,
      };
      Object.setPrototypeOf(mockError, ApiResponseError.prototype);
      return mockError;
    }

    case TwitterMockErrorType.REQUEST_ERROR: {
      const mockError = {
        message: message,
        name: 'ApiRequestError',
        type: 'request',
        requestError: { message, code: 'NETWORK_ERROR' },
        // Add other properties expected by ApiRequestError if needed
      };
      Object.setPrototypeOf(mockError, ApiRequestError.prototype);
      return mockError;
    }

    case TwitterMockErrorType.PARTIAL_RESPONSE_ERROR: {
      const mockError = {
        message: message,
        name: 'ApiPartialResponseError',
        type: 'partial',
        responseError: { message },
        // Add other properties expected by ApiPartialResponseError if needed
      };
      Object.setPrototypeOf(mockError, ApiPartialResponseError.prototype);
      return mockError;
    }

    case TwitterMockErrorType.NETWORK_ERROR: {
      // For generic network errors, a standard Error might suffice,
      // but ensure it has properties expected by the handling code if any.
      const error = new Error(message);
      error.name = 'NetworkError';
      (error as any).code = 'NETWORK_ERROR'; // Add code if needed by handlers
      return error;
    }

    default:
      throw new Error(`Unknown mock error type: ${errorType}`);
  }
}
