import { MediaContent, PostContent, PostResult, DeleteResult, LikeResult } from "../infrastructure/platform/abstract/platform-post.interface.ts";
import { ApiResponse, ErrorResponse } from "./response.types.ts";
import { z } from "zod";

/**
 * Types for POST /posts endpoint
 */

// Request types
export interface PostTarget {
  /**
   * The platform to post to (e.g., "twitter")
   */
  platform: string;
  
  /**
   * The user ID on the platform
   */
  userId: string;
}

export interface CreatePostRequest {
  /**
   * Array of targets to post to (can be a single target)
   */
  targets: PostTarget[];
  
  /**
   * The content of the post
   * Always an array of PostContent objects, even for a single post
   */
  content: PostContent[];
}

// Response types
export interface CreatePostTargetResult {
  /**
   * The platform the post was created on
   */
  platform: string;
  
  /**
   * The user ID on the platform
   */
  userId: string;
  
  /**
   * The result of the post creation
   */
  result: PostResult[];
}

export interface CreatePostTargetError {
  /**
   * The platform where the error occurred (if applicable)
   */
  platform?: string;
  
  /**
   * The user ID where the error occurred (if applicable)
   */
  userId?: string;
  
  /**
   * The error message
   */
  error: string;
}

export interface CreatePostResponse extends ApiResponse<{
  /**
   * Array of successful post results
   */
  results: CreatePostTargetResult[];
  
  /**
   * Array of errors that occurred (if any)
   */
  errors?: CreatePostTargetError[];
}> {}

/**
 * Types for POST /posts/repost endpoint
 */

// Request types
export interface RepostRequest {
  /**
   * The platform to repost on (e.g., "twitter")
   */
  platform: string;
  
  /**
   * The user ID on the platform
   */
  userId: string;
  
  /**
   * The ID of the post to repost
   */
  postId: string;
}

// Response types
export interface RepostResponse extends ApiResponse<PostResult> {}

/**
 * Types for POST /posts/quote endpoint
 */

// Request types
export interface QuotePostContent extends PostContent {
  /**
   * The platform to post on (required for the first item only in a thread)
   */
  platform?: string;
  
  /**
   * The user ID on the platform (required for the first item only in a thread)
   */
  userId?: string;
  
  /**
   * The ID of the post to quote (required for the first item only in a thread)
   */
  postId?: string;
}

export interface QuotePostRequest {
  /**
   * The platform to post on
   */
  platform: string;
  
  /**
   * The user ID on the platform
   */
  userId: string;
  
  /**
   * The ID of the post to quote
   */
  postId: string;
  
  /**
   * Content for the quote post(s)
   * Always an array, even for a single post
   */
  content: QuotePostContent[];
}

// Response types
export interface QuotePostResponse extends ApiResponse<PostResult[]> {}

/**
 * Types for DELETE /posts/{id} endpoint
 */

// Request types
export interface DeletePostRequest {
  /**
   * The platform to delete from (e.g., "twitter")
   */
  platform: string;
  
  /**
   * The user ID on the platform
   */
  userId: string;
  
  /**
   * The ID of the post to delete
   */
  postId: string;
}

// Response types
export interface DeletePostResponse extends ApiResponse<DeleteResult> {}

/**
 * Types for POST /posts/reply endpoint
 */

// Request types
export interface ReplyPostContent extends PostContent {
  /**
   * The platform to post on (required for the first item only in a thread)
   */
  platform?: string;
  
  /**
   * The user ID on the platform (required for the first item only in a thread)
   */
  userId?: string;
  
  /**
   * The ID of the post to reply to (required for the first item only in a thread)
   */
  postId?: string;
}

export interface ReplyToPostRequest {
  /**
   * The platform to post on
   */
  platform: string;
  
  /**
   * The user ID on the platform
   */
  userId: string;
  
  /**
   * The ID of the post to reply to
   */
  postId: string;
  
  /**
   * Content for the reply post(s)
   * Always an array, even for a single post
   */
  content: ReplyPostContent[];
}

// Response types
export interface ReplyToPostResponse extends ApiResponse<PostResult[]> {}

/**
 * Types for POST /posts/{id}/like endpoint
 */

// Request types
export interface LikePostRequest {
  /**
   * The platform to like on (e.g., "twitter")
   */
  platform: string;
  
  /**
   * The user ID on the platform
   */
  userId: string;
  
  /**
   * The ID of the post to like
   */
  postId: string;
}

// Response types
export interface LikePostResponse extends ApiResponse<LikeResult> {}

/**
 * Types for DELETE /posts/{id}/like endpoint
 */

// Request types
export interface UnlikePostRequest {
  /**
   * The platform to unlike on (e.g., "twitter")
   */
  platform: string;
  
  /**
   * The user ID on the platform
   */
  userId: string;
  
  /**
   * The ID of the post to unlike
   */
  postId: string;
}

// Response types
export interface UnlikePostResponse extends ApiResponse<LikeResult> {}

/**
 * Common error response type for all post endpoints
 */
export interface PostErrorResponse extends ErrorResponse {
  error: {
    /**
     * Error type
     */
    type: "validation_error" | "authentication_error" | "authorization_error" | "not_found" | "rate_limit_exceeded" | "internal_error" | string;
    
    /**
     * Error message
     */
    message: string;
    
    /**
     * HTTP status code
     */
    status?: number;
    
    /**
     * Additional error details
     */
    details?: any;
  };
}
