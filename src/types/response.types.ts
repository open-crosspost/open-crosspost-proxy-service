/**
 * Standard API response format
 */
export interface ApiResponse<T> {
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
 * Error response format
 */
export interface ErrorResponse {
  /**
   * Error information
   */
  error: {
    /**
     * Error type
     */
    type: string;
    
    /**
     * Error message
     */
    message: string;
    
    /**
     * Error code (if applicable)
     */
    code?: string;
    
    /**
     * Additional error details
     */
    details?: any;
  };
}

/**
 * Create a standard API response
 * @param data The response data
 * @param meta The response metadata
 * @returns A standard API response
 */
export function createApiResponse<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
  return {
    data,
    meta,
  };
}

/**
 * Create an error response
 * @param type The error type
 * @param message The error message
 * @param code The error code (if applicable)
 * @param details Additional error details
 * @returns An error response
 */
export function createErrorResponse(
  type: string,
  message: string,
  code?: string,
  details?: any
): ErrorResponse {
  return {
    error: {
      type,
      message,
      ...(code ? { code } : {}),
      ...(details ? { details } : {}),
    },
  };
}
