import { z } from 'zod';
import type { ResponseMeta } from './response.ts';
import type { PlatformName } from './common.ts';
import type { StatusCode } from './index.ts';

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
  MULTI_STATUS = 'MULTI_STATUS',
  POST_CREATION_FAILED = 'POST_CREATION_FAILED',
  THREAD_CREATION_FAILED = 'THREAD_CREATION_FAILED',
  POST_DELETION_FAILED = 'POST_DELETION_FAILED',
  POST_INTERACTION_FAILED = 'POST_INTERACTION_FAILED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',

  // Response format errors
  INVALID_RESPONSE = 'INVALID_RESPONSE',

  // Refresh errors
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  PROFILE_REFRESH_FAILED = 'PROFILE_REFRESH_FAILED',
}

export const ApiErrorCodeSchema = z.enum(Object.values(ApiErrorCode) as [string, ...string[]]);

/**
 * Map of API error codes to HTTP status codes
 * This ensures consistent HTTP status codes across the application
 */
export const errorCodeToStatusCode: Record<ApiErrorCode, StatusCode> = {
  [ApiErrorCode.MULTI_STATUS]: 207,
  [ApiErrorCode.UNKNOWN_ERROR]: 500,
  [ApiErrorCode.INTERNAL_ERROR]: 500,
  [ApiErrorCode.VALIDATION_ERROR]: 400,
  [ApiErrorCode.INVALID_REQUEST]: 400,
  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.RATE_LIMITED]: 429,
  [ApiErrorCode.PLATFORM_ERROR]: 502,
  [ApiErrorCode.PLATFORM_UNAVAILABLE]: 503,
  [ApiErrorCode.CONTENT_POLICY_VIOLATION]: 400,
  [ApiErrorCode.DUPLICATE_CONTENT]: 400,
  [ApiErrorCode.MEDIA_UPLOAD_FAILED]: 400,
  [ApiErrorCode.POST_CREATION_FAILED]: 500,
  [ApiErrorCode.THREAD_CREATION_FAILED]: 500,
  [ApiErrorCode.POST_DELETION_FAILED]: 500,
  [ApiErrorCode.POST_INTERACTION_FAILED]: 500,
  [ApiErrorCode.NETWORK_ERROR]: 503,
  [ApiErrorCode.INVALID_RESPONSE]: 500,
  [ApiErrorCode.TOKEN_REFRESH_FAILED]: 500,
  [ApiErrorCode.PROFILE_REFRESH_FAILED]: 500,
};

/**
 * Common error details that can be included in any error
 */
export interface ErrorDetails {
  platform?: PlatformName;
  userId?: string;
  [key: string]: unknown;
}

export const ErrorDetailSchema = z.object({
  message: z.string().describe('Human-readable error message'),
  code: ApiErrorCodeSchema.describe('Machine-readable error code'),
  recoverable: z.boolean().describe('Whether the error can be recovered from'),
  details: z.record(z.unknown()).optional().describe('Additional error details'),
});

export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;

export interface ApiErrorResponse {
  success: false;
  errors: ErrorDetail[];
  meta: ResponseMeta;
}
