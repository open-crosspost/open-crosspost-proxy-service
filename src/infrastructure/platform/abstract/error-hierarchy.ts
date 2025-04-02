/**
 * Base Error class for all application errors
 */
export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * API Error codes for standardized error identification
 */
export enum ApiErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // Authentication/Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',

  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',

  // Platform-specific errors
  PLATFORM_ERROR = 'PLATFORM_ERROR',
  PLATFORM_UNAVAILABLE = 'PLATFORM_UNAVAILABLE',

  // Content errors
  CONTENT_POLICY_VIOLATION = 'CONTENT_POLICY_VIOLATION',
  DUPLICATE_CONTENT = 'DUPLICATE_CONTENT',

  // Media errors
  MEDIA_UPLOAD_FAILED = 'MEDIA_UPLOAD_FAILED',

  // Post errors
  POST_CREATION_FAILED = 'POST_CREATION_FAILED',
  THREAD_CREATION_FAILED = 'THREAD_CREATION_FAILED',
  POST_DELETION_FAILED = 'POST_DELETION_FAILED',
  POST_INTERACTION_FAILED = 'POST_INTERACTION_FAILED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * API Error class for application-level errors
 */
export class ApiError extends BaseError {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, any>;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: ApiErrorCode = ApiErrorCode.INTERNAL_ERROR,
    status: number = 500,
    details?: Record<string, any>,
    recoverable: boolean = false,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.recoverable = recoverable;
  }

  /**
   * Create a validation error
   */
  static validation(message: string, details?: Record<string, any>): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.VALIDATION_ERROR,
      400,
      details,
      true,
    );
  }

  /**
   * Create an unauthorized error
   */
  static unauthorized(message: string = 'Unauthorized'): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.UNAUTHORIZED,
      401,
      undefined,
      true,
    );
  }

  /**
   * Create a forbidden error
   */
  static forbidden(message: string = 'Forbidden'): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.FORBIDDEN,
      403,
      undefined,
      false,
    );
  }

  /**
   * Create a not found error
   */
  static notFound(message: string = 'Resource not found'): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.NOT_FOUND,
      404,
      undefined,
      false,
    );
  }

  /**
   * Create a rate limit error
   */
  static rateLimited(
    message: string = 'Rate limit exceeded',
    details?: Record<string, any>,
  ): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.RATE_LIMITED,
      429,
      details,
      true,
    );
  }

  /**
   * Create an internal server error
   */
  static internal(
    message: string = 'Internal server error',
    details?: Record<string, any>,
  ): ApiError {
    return new ApiError(
      message,
      ApiErrorCode.INTERNAL_ERROR,
      500,
      details,
      false,
    );
  }
}

/**
 * Platform Error class for platform-specific errors
 */
export class PlatformError extends BaseError {
  public readonly platform: string;
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly originalError?: unknown;
  public readonly details?: Record<string, any>;
  public readonly recoverable: boolean;
  public readonly userId?: string;

  constructor(
    platform: string,
    message: string,
    code: ApiErrorCode = ApiErrorCode.PLATFORM_ERROR,
    status: number = 502,
    originalError?: unknown,
    details?: Record<string, any>,
    recoverable: boolean = false,
    userId?: string,
  ) {
    super(message);
    this.platform = platform;
    this.code = code;
    this.status = status;
    this.originalError = originalError;
    this.details = details;
    this.recoverable = recoverable;
    this.userId = userId;
  }

  /**
   * Create a platform unavailable error
   */
  static unavailable(
    platform: string,
    message: string = 'Platform API is unavailable',
    originalError?: unknown,
  ): PlatformError {
    return new PlatformError(
      platform,
      message,
      ApiErrorCode.PLATFORM_UNAVAILABLE,
      503,
      originalError,
      undefined,
      true,
    );
  }

  /**
   * Create a rate limited error
   */
  static rateLimited(
    platform: string,
    message: string = 'Rate limit exceeded',
    originalError?: unknown,
    details?: Record<string, any>,
    userId?: string,
  ): PlatformError {
    return new PlatformError(
      platform,
      message,
      ApiErrorCode.RATE_LIMITED,
      429,
      originalError,
      details,
      true,
      userId,
    );
  }

  /**
   * Create a content policy violation error
   */
  static contentPolicyViolation(
    platform: string,
    message: string = 'Content violates platform policy',
    originalError?: unknown,
    details?: Record<string, any>,
    userId?: string,
  ): PlatformError {
    return new PlatformError(
      platform,
      message,
      ApiErrorCode.CONTENT_POLICY_VIOLATION,
      400,
      originalError,
      details,
      false,
      userId,
    );
  }

  /**
   * Create a duplicate content error
   */
  static duplicateContent(
    platform: string,
    message: string = 'Duplicate content',
    originalError?: unknown,
    details?: Record<string, any>,
    userId?: string,
  ): PlatformError {
    return new PlatformError(
      platform,
      message,
      ApiErrorCode.DUPLICATE_CONTENT,
      400,
      originalError,
      details,
      true,
      userId,
    );
  }

  /**
   * Create a media upload failed error
   */
  static mediaUploadFailed(
    platform: string,
    message: string = 'Failed to upload media',
    originalError?: unknown,
    details?: Record<string, any>,
    userId?: string,
  ): PlatformError {
    return new PlatformError(
      platform,
      message,
      ApiErrorCode.MEDIA_UPLOAD_FAILED,
      400,
      originalError,
      details,
      true,
      userId,
    );
  }

  /**
   * Create a post creation failed error
   */
  static postCreationFailed(
    platform: string,
    message: string = 'Failed to create post',
    originalError?: unknown,
    details?: Record<string, any>,
    userId?: string,
  ): PlatformError {
    return new PlatformError(
      platform,
      message,
      ApiErrorCode.POST_CREATION_FAILED,
      400,
      originalError,
      details,
      true,
      userId,
    );
  }

  /**
   * Create a thread creation failed error
   */
  static threadCreationFailed(
    platform: string,
    message: string = 'Failed to create thread',
    originalError?: unknown,
    details?: Record<string, any>,
    userId?: string,
  ): PlatformError {
    return new PlatformError(
      platform,
      message,
      ApiErrorCode.THREAD_CREATION_FAILED,
      400,
      originalError,
      details,
      true,
      userId,
    );
  }

  /**
   * Create a network error
   */
  static networkError(
    platform: string,
    message: string = 'Network error',
    originalError?: unknown,
    userId?: string,
  ): PlatformError {
    return new PlatformError(
      platform,
      message,
      ApiErrorCode.NETWORK_ERROR,
      502,
      originalError,
      undefined,
      true,
      userId,
    );
  }

  /**
   * Create an unauthorized error
   */
  static unauthorized(
    platform: string,
    message: string = 'Unauthorized',
    originalError?: unknown,
    userId?: string,
  ): PlatformError {
    return new PlatformError(
      platform,
      message,
      ApiErrorCode.UNAUTHORIZED,
      401,
      originalError,
      undefined,
      true,
      userId,
    );
  }
}
