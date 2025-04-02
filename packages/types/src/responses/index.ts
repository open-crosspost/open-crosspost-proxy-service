/**
 * Response Types
 * Types for API response payloads
 */

import { ApiErrorCode, PlatformName } from '../common/index.js';

/**
 * Enhanced response metadata
 */
export interface EnhancedResponseMeta {
  requestId: string;
  timestamp: string;
  rateLimit?: {
    remaining: number;
    limit: number;
    reset: number;
  };
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    nextCursor?: string;
    prevCursor?: string;
  };
}

/**
 * Error detail
 */
export interface ErrorDetail {
  platform?: PlatformName;
  userId?: string;
  status: 'error';
  error: string;
  errorCode: ApiErrorCode;
  recoverable: boolean;
  details?: Record<string, any>;
}

/**
 * Success detail
 */
export interface SuccessDetail {
  platform: PlatformName;
  userId: string;
  status: 'success';
  postId?: string;
  postUrl?: string;
  [key: string]: any;
}

/**
 * Enhanced API response
 */
export interface EnhancedApiResponse<T> {
  success: boolean;
  data: T;
  meta?: EnhancedResponseMeta;
}

/**
 * Enhanced error response
 */
export interface EnhancedErrorResponse {
  success: false;
  errors: ErrorDetail[];
}

/**
 * Multi-status response
 */
export interface MultiStatusResponse {
  success: boolean;
  data: {
    summary: {
      total: number;
      succeeded: number;
      failed: number;
    };
    results: SuccessDetail[];
    errors: ErrorDetail[];
  };
}

/**
 * Media object
 */
export interface Media {
  id: string;
  type: 'image' | 'video' | 'gif';
  url?: string;
  altText?: string;
}

/**
 * Post metrics
 */
export interface PostMetrics {
  retweets: number;
  quotes: number;
  likes: number;
  replies: number;
}

/**
 * Post object
 */
export interface Post {
  id: string;
  text: string;
  createdAt: string;
  authorId: string;
  media?: Media[];
  metrics?: PostMetrics;
  inReplyToId?: string;
  quotedPostId?: string;
}

/**
 * Post response
 */
export type PostResponse = EnhancedApiResponse<Post | Post[]>;
export type CreatePostResponse = PostResponse;
export type RepostResponse = PostResponse;
export type QuotePostResponse = PostResponse;
export type ReplyToPostResponse = PostResponse;

/**
 * Delete post response
 */
export type DeletePostResponse = EnhancedApiResponse<{
  success: boolean;
  id: string;
}>;

/**
 * Like post response
 */
export type LikePostResponse = EnhancedApiResponse<{
  success: boolean;
  id: string;
}>;

/**
 * Unlike post response
 */
export type UnlikePostResponse = EnhancedApiResponse<{
  success: boolean;
  id: string;
}>;

/**
 * Auth URL response
 */
export type AuthUrlResponse = EnhancedApiResponse<{
  url: string;
  state: string;
  platform: PlatformName;
}>;

/**
 * Auth callback response
 */
export type AuthCallbackResponse = EnhancedApiResponse<{
  success: boolean;
  platform: PlatformName;
  userId: string;
  redirectUrl?: string;
}>;

/**
 * Auth status response
 */
export type AuthStatusResponse = EnhancedApiResponse<{
  platform: PlatformName;
  userId: string;
  authenticated: boolean;
  tokenStatus: {
    valid: boolean;
    expired: boolean;
    expiresAt?: string;
  };
}>;

/**
 * Auth revoke response
 */
export type AuthRevokeResponse = EnhancedApiResponse<{
  success: boolean;
  platform: PlatformName;
  userId: string;
}>;

/**
 * Connected accounts response
 */
export type ConnectedAccountsResponse = EnhancedApiResponse<Array<{
  platform: PlatformName;
  userId: string;
  username?: string;
  profileUrl?: string;
  connectedAt?: string;
}>>;

/**
 * NEAR authorization response
 */
export type NearAuthorizationResponse = EnhancedApiResponse<{
  success: boolean;
  nearAccount: string;
  authorized: boolean;
}>;

/**
 * NEAR authorization status response
 */
export type NearAuthorizationStatusResponse = EnhancedApiResponse<{
  nearAccount: string;
  authorized: boolean;
  authorizedAt?: string;
}>;

/**
 * Media upload response
 */
export type MediaUploadResponse = EnhancedApiResponse<{
  mediaId: string;
  platform: PlatformName;
  type: 'image' | 'video' | 'gif' | 'audio';
  status: 'pending' | 'processing' | 'failed' | 'succeeded';
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  url?: string;
  altText?: string;
  expiresAt?: string;
}>;

/**
 * Media status response
 */
export type MediaStatusResponse = EnhancedApiResponse<{
  mediaId: string;
  platform: PlatformName;
  status: 'pending' | 'processing' | 'failed' | 'succeeded';
  progress?: number;
  error?: string;
  url?: string;
}>;

/**
 * Media metadata update response
 */
export type MediaMetadataUpdateResponse = EnhancedApiResponse<{
  mediaId: string;
  platform: PlatformName;
  success: boolean;
  altText?: string;
}>;

/**
 * Rate limit endpoint
 */
export interface RateLimitEndpoint {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  limit: number;
  remaining: number;
  reset: number;
  resetDate: string;
}

/**
 * Rate limit status response
 */
export type RateLimitStatusResponse = EnhancedApiResponse<{
  platform: PlatformName;
  userId?: string;
  endpoints: RateLimitEndpoint[];
  app?: {
    limit: number;
    remaining: number;
    reset: number;
    resetDate: string;
  };
}>;

/**
 * All rate limits response
 */
export type AllRateLimitsResponse = EnhancedApiResponse<{
  platforms: Record<PlatformName, {
    users: Record<string, {
      endpoints: RateLimitEndpoint[];
      lastUpdated: string;
    }>;
    app?: {
      limit: number;
      remaining: number;
      reset: number;
      resetDate: string;
    };
  }>;
}>;
