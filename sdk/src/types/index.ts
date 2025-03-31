import { SupportedPlatform } from '../config.ts';

/**
 * Generic API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * User profile interface
 */
export interface UserProfile {
  userId: string;
  username: string;
  url?: string;
  profileImageUrl: string;
  isPremium?: boolean;
  platform: string;
  lastUpdated: number; // timestamp
}

/**
 * Platform account interface
 */
export interface PlatformAccount {
  platform: SupportedPlatform;
  userId: string;
  username: string;
  profileImageUrl?: string;
  profile?: UserProfile;
}

/**
 * Post target interface
 */
export interface PostTarget {
  platform: SupportedPlatform;
  userId: string;
}

/**
 * Post media interface
 */
export interface PostMedia {
  data: string; // Base64 encoded data or URL
  mimeType: string;
  altText?: string;
}

/**
 * Post content interface
 */
export interface PostContent {
  text: string;
  media?: PostMedia[];
  mediaId?: string | null;
  mediaPreview?: string | null;
}

/**
 * Post request interface
 */
export interface PostRequest {
  targets: PostTarget[];
  content: PostContent[];
}

/**
 * Post result interface
 */
export interface PostResult {
  id: string;
  text?: string;
  createdAt: string;
  mediaIds?: string[];
  threadIds?: string[];
  quotedPostId?: string;
  inReplyToId?: string;
  success?: boolean;
  [key: string]: any;
}

/**
 * Create post response interface
 */
export interface CreatePostResponse {
  results: {
    platform: SupportedPlatform;
    userId: string;
    result: PostResult[];
  }[];
  errors?: {
    platform?: SupportedPlatform;
    userId?: string;
    error: string;
  }[];
}

/**
 * Delete post result interface
 */
export interface DeleteResult {
  success: boolean;
  id: string;
}

/**
 * Like post result interface
 */
export interface LikeResult {
  success: boolean;
  id: string;
}

/**
 * Rate limit status interface
 */
export interface RateLimitStatus {
  endpoint?: string;
  remaining: number;
  limit: number;
  reset: number; // timestamp
}

/**
 * Auth URL response interface
 */
export interface AuthUrlResponse {
  authUrl: string;
}

/**
 * Account status response interface
 */
export interface AccountStatusResponse {
  isConnected: boolean;
}
