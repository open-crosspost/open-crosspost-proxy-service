import { PlatformName } from './platform.types.ts';
import { ApiErrorCode } from '../infrastructure/platform/abstract/error-hierarchy.ts';

/**
 * Enhanced API response format
 */
export interface EnhancedApiResponse<T> {
  /**
   * Success indicator
   */
  success: boolean;

  /**
   * Response data
   */
  data: T;

  /**
   * Response metadata
   */
  meta?: {
    /**
     * Rate limit information
     */
    rateLimit?: {
      /**
       * Number of requests remaining in the current window
       */
      remaining: number;

      /**
       * Total number of requests allowed in the window
       */
      limit: number;

      /**
       * Timestamp when the rate limit resets (in seconds since epoch)
       */
      reset: number;
    };

    /**
     * Pagination information
     */
    pagination?: {
      /**
       * Current page number
       */
      page: number;

      /**
       * Number of items per page
       */
      perPage: number;

      /**
       * Total number of items
       */
      total: number;

      /**
       * Total number of pages
       */
      totalPages: number;

      /**
       * Next page cursor (if applicable)
       */
      nextCursor?: string;

      /**
       * Previous page cursor (if applicable)
       */
      prevCursor?: string;
    };
  };
}

/**
 * Enhanced error detail format
 */
export interface ErrorDetail {
  /**
   * Platform associated with the error (if applicable)
   */
  platform?: PlatformName;

  /**
   * User ID associated with the error (if applicable)
   */
  userId?: string;

  /**
   * Error status
   */
  status: 'error';

  /**
   * Human-readable error message
   */
  error: string;

  /**
   * Machine-readable error code
   */
  errorCode: ApiErrorCode;

  /**
   * Whether the error is recoverable (can be retried)
   */
  recoverable: boolean;

  /**
   * Additional error details (platform-specific)
   */
  details?: Record<string, any>;
}

/**
 * Enhanced success detail format
 */
export interface SuccessDetail {
  /**
   * Platform associated with the success
   */
  platform: PlatformName;

  /**
   * User ID associated with the success
   */
  userId: string;

  /**
   * Success status
   */
  status: 'success';

  /**
   * Post ID (if applicable)
   */
  postId?: string;

  /**
   * Post URL (if applicable)
   */
  postUrl?: string;

  /**
   * Additional success details
   */
  [key: string]: any;
}

/**
 * Enhanced error response format
 */
export interface EnhancedErrorResponse {
  /**
   * Success indicator (always false for error responses)
   */
  success: false;

  /**
   * Error information
   */
  errors: ErrorDetail[];
}

/**
 * Multi-status response format for partial successes/failures
 */
export interface MultiStatusResponse {
  /**
   * Success indicator (true if at least one operation succeeded)
   */
  success: boolean;

  /**
   * Response data
   */
  data: {
    /**
     * Summary of operations
     */
    summary: {
      /**
       * Total number of operations
       */
      total: number;

      /**
       * Number of successful operations
       */
      succeeded: number;

      /**
       * Number of failed operations
       */
      failed: number;
    };

    /**
     * Successful results
     */
    results: SuccessDetail[];

    /**
     * Failed results
     */
    errors: ErrorDetail[];
  };
}

/**
 * Create an enhanced API response
 * @param data The response data
 * @param meta The response metadata
 * @returns An enhanced API response
 */
export function createEnhancedApiResponse<T>(
  data: T,
  meta?: EnhancedApiResponse<T>['meta']
): EnhancedApiResponse<T> {
  return {
    success: true,
    data,
    meta,
  };
}

/**
 * Create an enhanced error response
 * @param errors The error details
 * @returns An enhanced error response
 */
export function createEnhancedErrorResponse(
  errors: ErrorDetail[]
): EnhancedErrorResponse {
  return {
    success: false,
    errors,
  };
}

/**
 * Create a multi-status response
 * @param results Successful results
 * @param errors Failed results
 * @returns A multi-status response
 */
export function createMultiStatusResponse(
  results: SuccessDetail[],
  errors: ErrorDetail[]
): MultiStatusResponse {
  const total = results.length + errors.length;
  const succeeded = results.length;
  const failed = errors.length;

  return {
    success: succeeded > 0,
    data: {
      summary: {
        total,
        succeeded,
        failed,
      },
      results,
      errors,
    },
  };
}

/**
 * Create an error detail
 * @param error Error message
 * @param errorCode Error code
 * @param platform Platform associated with the error
 * @param userId User ID associated with the error
 * @param recoverable Whether the error is recoverable
 * @param details Additional error details
 * @returns An error detail
 */
export function createErrorDetail(
  error: string,
  errorCode: ApiErrorCode,
  platform?: PlatformName,
  userId?: string,
  recoverable: boolean = false,
  details?: Record<string, any>
): ErrorDetail {
  return {
    status: 'error',
    error,
    errorCode,
    platform,
    userId,
    recoverable,
    details,
  };
}

/**
 * Create a success detail
 * @param platform Platform associated with the success
 * @param userId User ID associated with the success
 * @param additionalData Additional success data
 * @returns A success detail
 */
export function createSuccessDetail(
  platform: PlatformName,
  userId: string,
  additionalData: Record<string, any> = {}
): SuccessDetail {
  return {
    platform,
    userId,
    status: 'success',
    ...additionalData,
  };
}
