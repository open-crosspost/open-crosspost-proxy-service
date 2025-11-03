/**
 * A simplified mock error class mimicking the structure of twitter-api-v2 errors
 * needed for our error handling logic.
 */
class MockTwitterApiError extends Error {
  code: number;
  data: { errors: Array<{ code: number; message: string }> };
  rateLimitError?: boolean;
  isAuthError?: boolean;
  type?: string; // Add type property for compatibility

  constructor(code: number, message: string) {
    super(message);
    this.name = 'ApiResponseError'; // Mimic the name
    this.code = code;
    this.data = { errors: [{ code, message }] };
    this.type = 'response'; // Mimic the type

    // Set special flags based on error code
    if (code === 88) this.rateLimitError = true;
    if ([89, 32, 87].includes(code)) this.isAuthError = true;
  }
}

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
  // Use the simplified MockTwitterApiError or basic Error objects
  switch (errorType) {
    case TwitterMockErrorType.RESPONSE_ERROR:
      // Use our simplified mock class
      return new MockTwitterApiError(code, message);

    case TwitterMockErrorType.REQUEST_ERROR: {
      // Create a basic error mimicking ApiRequestError structure
      const error = new Error(message);
      error.name = 'ApiRequestError';
      (error as any).type = 'request';
      (error as any).requestError = { message, code: 'NETWORK_ERROR' };
      return error;
    }

    case TwitterMockErrorType.PARTIAL_RESPONSE_ERROR: {
      // Create a basic error mimicking ApiPartialResponseError structure
      const error = new Error(message);
      error.name = 'ApiPartialResponseError';
      (error as any).type = 'partial';
      (error as any).responseError = { message };
      return error;
    }

    case TwitterMockErrorType.NETWORK_ERROR: {
      // Create a basic network error
      const error = new Error(message);
      error.name = 'NetworkError';
      (error as any).code = 'NETWORK_ERROR';
      return error;
    }

    default:
      throw new Error(`Unknown mock error type: ${errorType}`);
  }
}
