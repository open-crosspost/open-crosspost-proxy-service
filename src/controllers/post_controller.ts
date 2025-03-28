import { z } from 'zod';
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

      // Parse request body
      const body = await c.req.json();

      // Validate and normalize the request
      let normalizedRequest: CreatePostRequest;

      // Check if we have a properly formatted request with targets array
      if (body.targets && Array.isArray(body.targets) && body.content) {
        normalizedRequest = {
          targets: body.targets,
          content: Array.isArray(body.content) ? body.content : [{ text: body.content }],
        };
      } // Check if we have a single target with platform and userId directly in the request
      else if (body.platform && body.userId && body.content) {
        normalizedRequest = {
          targets: [{ platform: body.platform, userId: body.userId }],
          content: Array.isArray(body.content) ? body.content : [{ text: body.content }],
        };
      } // Invalid request format
      else {
        return c.json({
          error: {
            type: 'validation_error',
            message: 'Invalid request format. Must include targets and content.',
          },
        }, 400);
      }
      // Process all targets
      const results: Array<{ platform: string; userId: string; result: any }> = [];
      const errors: Array<{ platform?: string; userId?: string; error: string }> = [];

      for (const target of normalizedRequest.targets) {
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
            normalizedRequest.content,
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

      // Parse request body
      const body = await c.req.json() as RepostRequest;

      // Validate request body
      const schema = z.object({
        platform: z.string(),
        userId: z.string(),
        postId: z.string(),
      });

      const result = schema.safeParse(body);
      if (!result.success) {
        return c.json({
          error: {
            type: 'validation_error',
            message: 'Invalid request body',
            details: result.error,
          },
        }, 400);
      }

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

      // Parse request body
      const body = await c.req.json();

      // Validate and normalize the request
      let normalizedRequest: QuotePostRequest;

      // Check if we have a properly formatted request
      if (body.platform && body.userId && body.postId) {
        normalizedRequest = {
          platform: body.platform,
          userId: body.userId,
          postId: body.postId,
          content: Array.isArray(body.content) ? body.content : [{
            text: body.text || '',
            media: body.media,
          }],
        };
      } // Check if we have an array of quote posts (thread)
      else if (
        Array.isArray(body) && body.length > 0 && body[0].platform && body[0].userId &&
        body[0].postId
      ) {
        const { platform, userId, postId } = body[0];

        normalizedRequest = {
          platform,
          userId,
          postId,
          content: body.map((item) => ({
            text: item.text || '',
            media: item.media,
          })),
        };
      } // Invalid request format
      else {
        return c.json({
          error: {
            type: 'validation_error',
            message: 'Invalid request format. Must include platform, userId, postId, and content.',
          },
        }, 400);
      }

      // Verify platform access
      await verifyPlatformAccess(signerId, normalizedRequest.platform, normalizedRequest.userId);

      // Quote the post
      const result = await this.postService.quotePost(
        normalizedRequest.platform,
        normalizedRequest.userId,
        normalizedRequest.postId,
        normalizedRequest.content,
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

      // Parse request body
      const body = await c.req.json() as DeletePostRequest;

      // Validate request body
      const schema = z.object({
        platform: z.string(),
        userId: z.string(),
        postId: z.string(),
      });

      const result = schema.safeParse(body);
      if (!result.success) {
        return c.json({
          error: {
            type: 'validation_error',
            message: 'Invalid request body',
            details: result.error,
          },
        }, 400);
      }

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

      // Parse request body
      const body = await c.req.json();

      // Validate and normalize the request
      let normalizedRequest: ReplyToPostRequest;

      // Check if we have a properly formatted request
      if (body.platform && body.userId && body.postId) {
        normalizedRequest = {
          platform: body.platform,
          userId: body.userId,
          postId: body.postId,
          content: Array.isArray(body.content) ? body.content : [{
            text: body.text || '',
            media: body.media,
          }],
        };
      } // Check if we have an array of reply posts (thread)
      else if (
        Array.isArray(body) && body.length > 0 && body[0].platform && body[0].userId &&
        body[0].postId
      ) {
        const { platform, userId, postId } = body[0];

        normalizedRequest = {
          platform,
          userId,
          postId,
          content: body.map((item) => ({
            text: item.text || '',
            media: item.media,
          })),
        };
      } // Invalid request format
      else {
        return c.json({
          error: {
            type: 'validation_error',
            message: 'Invalid request format. Must include platform, userId, postId, and content.',
          },
        }, 400);
      }

      // Verify platform access
      await verifyPlatformAccess(signerId, normalizedRequest.platform, normalizedRequest.userId);

      // Reply to the post
      const result = await this.postService.replyToPost(
        normalizedRequest.platform,
        normalizedRequest.userId,
        normalizedRequest.postId,
        normalizedRequest.content,
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

      // Parse request body
      const body = await c.req.json() as LikePostRequest;

      // Validate request body
      const schema = z.object({
        platform: z.string(),
        userId: z.string(),
        postId: z.string(),
      });

      const result = schema.safeParse(body);
      if (!result.success) {
        return c.json({
          error: {
            type: 'validation_error',
            message: 'Invalid request body',
            details: result.error,
          },
        }, 400);
      }

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

      // Parse request body
      const body = await c.req.json() as UnlikePostRequest;

      // Validate request body
      const schema = z.object({
        platform: z.string(),
        userId: z.string(),
        postId: z.string(),
      });

      const result = schema.safeParse(body);
      if (!result.success) {
        return c.json({
          error: {
            type: 'validation_error',
            message: 'Invalid request body',
            details: result.error,
          },
        }, 400);
      }

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
