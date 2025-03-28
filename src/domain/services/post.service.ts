import { 
  PostContent, 
  PostResult, 
  DeleteResult, 
  LikeResult 
} from '../../infrastructure/platform/abstract/platform-post.interface.ts';
import { PlatformPost } from '../../infrastructure/platform/abstract/platform-post.interface.ts';
import { TwitterPost } from '../../infrastructure/platform/twitter/twitter-post.ts';
import { Env } from '../../config/env.ts';
import { createApiResponse, createErrorResponse } from '../../types/response.types.ts';

/**
 * Post Service
 * Domain service for post-related operations
 */
export class PostService {
  private platformPost: PlatformPost;
  
  constructor(env: Env) {
    // For now, we only support Twitter
    this.platformPost = new TwitterPost(env);
  }
  
  /**
   * Create a new post
   * @param userId The user ID creating the post
   * @param content The content of the post or an array of contents for a thread
   * @returns The created post result
   */
  async createPost(userId: string, content: PostContent | PostContent[]): Promise<PostResult> {
    try {
      return await this.platformPost.createPost(userId, content);
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }
  
  /**
   * Repost/retweet an existing post
   * @param userId The user ID performing the repost
   * @param postId The ID of the post to repost
   * @returns The repost result
   */
  async repost(userId: string, postId: string): Promise<PostResult> {
    try {
      return await this.platformPost.repost(userId, postId);
    } catch (error) {
      console.error('Error reposting:', error);
      throw error;
    }
  }
  
  /**
   * Quote an existing post
   * @param userId The user ID quoting the post
   * @param postId The ID of the post to quote
   * @param content The content to add to the quote or an array of contents for a thread
   * @returns The quote post result
   */
  async quotePost(userId: string, postId: string, content: PostContent | PostContent[]): Promise<PostResult> {
    try {
      return await this.platformPost.quotePost(userId, postId, content);
    } catch (error) {
      console.error('Error quoting post:', error);
      throw error;
    }
  }
  
  /**
   * Delete a post
   * @param userId The user ID deleting the post
   * @param postId The ID of the post to delete
   * @returns The delete result
   */
  async deletePost(userId: string, postId: string): Promise<DeleteResult> {
    try {
      return await this.platformPost.deletePost(userId, postId);
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }
  
  /**
   * Reply to an existing post
   * @param userId The user ID replying to the post
   * @param postId The ID of the post to reply to
   * @param content The content of the reply or an array of contents for a thread
   * @returns The reply post result
   */
  async replyToPost(userId: string, postId: string, content: PostContent | PostContent[]): Promise<PostResult> {
    try {
      return await this.platformPost.replyToPost(userId, postId, content);
    } catch (error) {
      console.error('Error replying to post:', error);
      throw error;
    }
  }
  
  /**
   * Like a post
   * @param userId The user ID liking the post
   * @param postId The ID of the post to like
   * @returns The like result
   */
  async likePost(userId: string, postId: string): Promise<LikeResult> {
    try {
      return await this.platformPost.likePost(userId, postId);
    } catch (error) {
      console.error('Error liking post:', error);
      throw error;
    }
  }
  
  /**
   * Unlike a post
   * @param userId The user ID unliking the post
   * @param postId The ID of the post to unlike
   * @returns The unlike result
   */
  async unlikePost(userId: string, postId: string): Promise<LikeResult> {
    try {
      return await this.platformPost.unlikePost(userId, postId);
    } catch (error) {
      console.error('Error unliking post:', error);
      throw error;
    }
  }
  
  /**
   * Create a standard API response
   * @param data The response data
   * @param status The response status
   * @returns A standard API response
   */
  createResponse(data: any): Response {
    return new Response(JSON.stringify(createApiResponse(data)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  /**
   * Create an error response
   * @param error The error object
   * @param status The response status
   * @returns An error response
   */
  createErrorResponse(error: any, status = 500): Response {
    const errorMessage = error.message || 'An unexpected error occurred';
    const errorType = error.type || 'INTERNAL_ERROR';
    
    return new Response(JSON.stringify(createErrorResponse(errorType, errorMessage, error.code, error.details)), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
