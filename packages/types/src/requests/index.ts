/**
 * Request Types
 * Types for API request payloads
 */

import { MediaContent, PlatformName, PostContent } from '../common/index.js';

/**
 * Base request interface with platform information
 */
export interface PlatformRequest {
  platform: PlatformName;
  userId: string;
}

/**
 * Post creation request
 */
export interface CreatePostRequest extends PlatformRequest {
  content: PostContent | PostContent[];
}

/**
 * Repost request
 */
export interface RepostRequest extends PlatformRequest {
  postId: string;
}

/**
 * Quote post request
 */
export interface QuotePostRequest extends PlatformRequest {
  postId: string;
  content: PostContent;
}

/**
 * Reply to post request
 */
export interface ReplyToPostRequest extends PlatformRequest {
  postId: string;
  content: PostContent;
}

/**
 * Delete post request
 */
export interface DeletePostRequest extends PlatformRequest {
  postId: string;
}

/**
 * Like post request
 */
export interface LikePostRequest extends PlatformRequest {
  postId: string;
}

/**
 * Unlike post request
 */
export interface UnlikePostRequest extends PlatformRequest {
  postId: string;
}

/**
 * Media upload request
 */
export interface MediaUploadRequest extends PlatformRequest {
  media: MediaContent;
}

/**
 * Media status request
 */
export interface MediaStatusRequest extends PlatformRequest {
  mediaId: string;
}

/**
 * Media metadata update request
 */
export interface MediaMetadataUpdateRequest extends PlatformRequest {
  mediaId: string;
  altText?: string;
}

/**
 * Auth URL request
 */
export interface AuthUrlRequest {
  platform: PlatformName;
  redirectUri: string;
  scopes?: string[];
  successUrl?: string;
  errorUrl?: string;
}

/**
 * Auth callback request
 */
export interface AuthCallbackRequest {
  platform: PlatformName;
  code: string;
  state: string;
}

/**
 * Auth status request
 */
export interface AuthStatusRequest {
  platform: PlatformName;
  userId: string;
}

/**
 * Auth revoke request
 */
export interface AuthRevokeRequest {
  platform: PlatformName;
  userId: string;
}

/**
 * NEAR authorization request
 */
export interface NearAuthorizationRequest {
  nearAccount: string;
}

/**
 * Rate limit status request
 */
export interface RateLimitStatusRequest {
  platform: PlatformName;
  userId?: string;
}
