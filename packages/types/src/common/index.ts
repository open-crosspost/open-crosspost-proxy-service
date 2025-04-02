/**
 * Common Types
 * Shared types used across the API
 */

/**
 * Platform names supported by the API
 */
export enum PlatformName {
  TWITTER = 'twitter',
  MASTODON = 'mastodon',
  LINKEDIN = 'linkedin',
  FACEBOOK = 'facebook'
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
 * Media content type
 */
export interface MediaContent {
  data: string | Blob;
  mimeType?: string;
  altText?: string;
}

/**
 * Post content type
 */
export interface PostContent {
  text?: string;
  media?: MediaContent[];
  platform?: PlatformName;
  userId?: string;
  postId?: string;
}

/**
 * NEAR Authentication Data
 */
export interface NearAuthData {
  account_id: string;
  public_key: string;
  signature: string;
  message: string;
  nonce: string;
  recipient?: string;
  callback_url?: string;
}
