import { Context } from '../../deps.ts';
import { getEnv } from '../config/env.ts';
import { PostService } from '../domain/services/post.service.ts';
import {
  CreatePostRequest,
  DeletePostRequest,
  LikePostRequest,
  QuotePostRequest,
  ReplyToPostRequest,
  RepostRequest,
  UnlikePostRequest,
} from '../types/post.types.ts';
import { PlatformName } from '../types/platform.types.ts';
import { verifyPlatformAccess } from '../utils/near-auth.utils.ts';

/**
 * Post Controller
 * Handles HTTP requests for post-related operations
 */
export class PostController {
  private postService: PostService;

  constructor() {
    const env = getEnv();
    this.postService = new PostService(env);
  }

  /**
   * Create a new post
   * @param c The Hono context
   * @returns HTTP response
   */
  async createPost(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      const request = await c.req.json() as CreatePostRequest;

      const results: Array<{ platform: PlatformName; userId: string; result: any }> = [];
      const errors: Array<{ platform?: PlatformName; userId?: string; error: string }> = [];

      for (const target of request.targets) {
        try {
          const { platform, userId } = target;

          try {
            // Verify platform access
            await verifyPlatformAccess(signerId, platform, userId);
          } catch (error) {
            errors.push({
              platform,
              userId,
              error: error instanceof Error
                ? error.message
                : `No connected ${platform} account found for user ID ${userId}`,
            });
            continue;
          }

          // Create the post
          const result = await this.postService.createPost(
            platform,
            userId,
            request.content,
          );

          results.push({
            platform,
            userId,
            result,
          });
        } catch (error) {
          errors.push({
            platform: target.platform,
            userId: target.userId,
            error: error instanceof Error ? error.message : 'An unexpected error occurred',
          });
        }
      }

      // Return the combined results
      return c.json({
        data: {
          results,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    } catch (error) {
      console.error('Error creating post:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }

  /**
   * Repost/retweet an existing post
   * @param c The Hono context
   * @returns HTTP response
   */
  async repost(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      const body = await c.req.json() as RepostRequest;

      // Verify platform access
      await verifyPlatformAccess(signerId, body.platform, body.userId);

      // Repost the post
      const repostResult = await this.postService.repost(body.platform, body.userId, body.postId);

      // Return the result
      return c.json({ data: repostResult });
    } catch (error) {
      console.error('Error reposting:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }

  /**
   * Quote an existing post
   * @param c The Hono context
   * @returns HTTP response
   */
  async quotePost(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      const request = await c.req.json() as QuotePostRequest;

      // Verify platform access
      await verifyPlatformAccess(signerId, request.platform, request.userId);

      // Quote the post
      const result = await this.postService.quotePost(
        request.platform,
        request.userId,
        request.postId,
        request.content,
      );

      // Return the result
      return c.json({ data: result });
    } catch (error) {
      console.error('Error quoting post:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }

  /**
   * Delete a post
   * @param c The Hono context
   * @returns HTTP response
   */
  async deletePost(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      const body = await c.req.json() as DeletePostRequest;

      // Verify platform access
      await verifyPlatformAccess(signerId, body.platform, body.userId);

      // Delete the post
      const deleteResult = await this.postService.deletePost(
        body.platform,
        body.userId,
        body.postId,
      );

      // Return the result
      return c.json({ data: deleteResult });
    } catch (error) {
      console.error('Error deleting post:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }

  /**
   * Reply to an existing post
   * @param c The Hono context
   * @returns HTTP response
   */
  async replyToPost(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      const request = await c.req.json() as ReplyToPostRequest;

      // Verify platform access
      await verifyPlatformAccess(signerId, request.platform, request.userId);

      // Reply to the post
      const result = await this.postService.replyToPost(
        request.platform,
        request.userId,
        request.postId,
        request.content,
      );

      // Return the result
      return c.json({ data: result });
    } catch (error) {
      console.error('Error replying to post:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }

  /**
   * Like a post
   * @param c The Hono context
   * @returns HTTP response
   */
  async likePost(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      const body = await c.req.json() as LikePostRequest;

      // Verify platform access
      await verifyPlatformAccess(signerId, body.platform, body.userId);

      // Like the post
      const likeResult = await this.postService.likePost(body.platform, body.userId, body.postId);

      // Return the result
      return c.json({ data: likeResult });
    } catch (error) {
      console.error('Error liking post:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }

  /**
   * Unlike a post
   * @param c The Hono context
   * @returns HTTP response
   */
  async unlikePost(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      const body = await c.req.json() as UnlikePostRequest;

      // Verify platform access
      await verifyPlatformAccess(signerId, body.platform, body.userId);

      // Unlike the post
      const unlikeResult = await this.postService.unlikePost(
        body.platform,
        body.userId,
        body.postId,
      );

      // Return the result
      return c.json({ data: unlikeResult });
    } catch (error) {
      console.error('Error unliking post:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }
}
