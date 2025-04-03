
/**
 * Platform Error Types
 * Defines common error types for platform operations
 */
export enum PlatformErrorType {
  TOKEN_EXPIRED = 'token_expired',
  INVALID_TOKEN = 'invalid_token',
  RATE_LIMITED = 'rate_limited',
  PERMISSION_DENIED = 'permission_denied',
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_FAILED = 'authentication_failed',
  API_ERROR = 'api_error',
  UNKNOWN = 'unknown',
}

/**
 * Platform Error
 * Custom error class for platform-specific errors
 */
export class PlatformError extends Error {
  constructor(
    public type: PlatformErrorType,
    message: string,
    public originalError?: unknown,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'PlatformError';
  }

  /**
   * Create a token expired error
   * @param message Error message
   * @param originalError Original error
   * @returns Platform error
   */
  static tokenExpired(message: string, originalError?: unknown): PlatformError {
    return new PlatformError(
      PlatformErrorType.TOKEN_EXPIRED,
      message,
      originalError,
    );
  }

  /**
   * Create an invalid token error
   * @param message Error message
   * @param originalError Original error
   * @returns Platform error
   */
  static invalidToken(message: string, originalError?: unknown): PlatformError {
    return new PlatformError(
      PlatformErrorType.INVALID_TOKEN,
      message,
      originalError,
    );
  }

  /**
   * Create a rate limited error
   * @param message Error message
   * @param originalError Original error
   * @param statusCode HTTP status code
   * @returns Platform error
   */
  static rateLimited(message: string, originalError?: unknown, statusCode?: number): PlatformError {
    return new PlatformError(
      PlatformErrorType.RATE_LIMITED,
      message,
      originalError,
      statusCode,
    );
  }

  /**
   * Create a permission denied error
   * @param message Error message
   * @param originalError Original error
   * @param statusCode HTTP status code
   * @returns Platform error
   */
  static permissionDenied(
    message: string,
    originalError?: unknown,
    statusCode?: number,
  ): PlatformError {
    return new PlatformError(
      PlatformErrorType.PERMISSION_DENIED,
      message,
      originalError,
      statusCode,
    );
  }

  /**
   * Create a network error
   * @param message Error message
   * @param originalError Original error
   * @returns Platform error
   */
  static networkError(message: string, originalError?: unknown): PlatformError {
    return new PlatformError(
      PlatformErrorType.NETWORK_ERROR,
      message,
      originalError,
    );
  }

  /**
   * Create an authentication failed error
   * @param message Error message
   * @param originalError Original error
   * @param statusCode HTTP status code
   * @returns Platform error
   */
  static authenticationFailed(
    message: string,
    originalError?: unknown,
    statusCode?: number,
  ): PlatformError {
    return new PlatformError(
      PlatformErrorType.AUTHENTICATION_FAILED,
      message,
      originalError,
      statusCode,
    );
  }

  /**
   * Create an API error
   * @param message Error message
   * @param originalError Original error
   * @param statusCode HTTP status code
   * @returns Platform error
   */
  static apiError(message: string, originalError?: unknown, statusCode?: number): PlatformError {
    return new PlatformError(
      PlatformErrorType.API_ERROR,
      message,
      originalError,
      statusCode,
    );
  }

  /**
   * Create an unknown error
   * @param message Error message
   * @param originalError Original error
   * @returns Platform error
   */
  static unknown(message: string, originalError?: unknown): PlatformError {
    return new PlatformError(
      PlatformErrorType.UNKNOWN,
      message,
      originalError,
    );
  }
}
