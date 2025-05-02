import type {
  ApiErrorCode,
  ApiResponse,
  ErrorDetail,
  ErrorDetails,
  MultiStatusData,
  PlatformName,
  ResponseMeta,
  SuccessDetail,
} from '@crosspost/types';
import { Context } from '../deps.ts';

/**
 * Creates a ResponseMeta object with required fields
 * @param c Hono context
 * @param options Optional metadata
 * @returns ResponseMeta with requestId and timestamp
 */
function createResponseMeta(
  c: Context,
  options: Partial<ResponseMeta> = {},
): ResponseMeta {
  return {
    requestId: c.get('requestId'),
    timestamp: new Date().toISOString(),
    rateLimit: options.rateLimit,
    pagination: options.pagination,
  };
}

/**
 * Create a success response
 * @param c Hono context
 * @param data Response data
 * @param meta Optional metadata
 * @returns API response with success true
 */
export function createSuccessResponse<T>(
  c: Context,
  data: T,
  meta: Partial<ResponseMeta> = {},
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: createResponseMeta(c, meta),
  };
}

/**
 * Create an error response
 * @param c Hono context
 * @param errors Array of error details
 * @param meta Optional metadata
 * @returns API response with success false
 */
export function createErrorResponse(
  c: Context,
  errors: ErrorDetail[],
  meta: Partial<ResponseMeta> = {},
): ApiResponse<never> {
  return {
    success: false,
    errors,
    meta: createResponseMeta(c, meta),
  };
}

/**
 * Create an error detail for the API response.
 * @param message Error message
 * @param code Error code
 * @param recoverable Whether the error is recoverable
 * @param details Optional additional details
 * @returns Error detail object
 */
export function createErrorDetail(
  message: string,
  code: ApiErrorCode,
  recoverable: boolean,
  details?: ErrorDetails,
): ErrorDetail {
  return {
    message,
    code,
    recoverable,
    details,
  };
}

/**
 * Create a success detail for multi-status operations
 * @param platform Platform
 * @param userId User ID
 * @param details Additional data
 * @returns Success detail object
 */
export function createSuccessDetail<T>(
  platform: PlatformName,
  userId: string,
  details?: T,
): SuccessDetail {
  return {
    platform,
    userId,
    status: 'success',
    details: details,
  };
}

/**
 * Create a multi-status response
 * @param results Successful results
 * @param errors Failed results
 * @returns Multi-status data
 */
export function createMultiStatusData(
  results: SuccessDetail[],
  errors: ErrorDetail[],
): MultiStatusData {
  const total = results.length + errors.length;
  const succeeded = results.length;
  const failed = errors.length;

  return {
    summary: {
      total,
      succeeded,
      failed,
    },
    results,
    errors,
  };
}
