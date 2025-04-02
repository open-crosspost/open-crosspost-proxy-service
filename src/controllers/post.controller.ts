import { Context } from '../../deps.ts';
import { getEnv } from '../config/env.ts';
import { ActivityTrackingService } from '../domain/services/activity-tracking.service.ts';
import { PostService } from '../domain/services/post.service.ts';
import { RateLimitService } from '../domain/services/rate-limit.service.ts';
import { ApiErrorCode, PlatformError } from '../infrastructure/platform/abstract/error-hierarchy.ts';
import { TwitterError } from '../infrastructure/platform/twitter/twitter-error.ts';
import {
  createEnhancedApiResponse,
  createEnhancedErrorResponse,
  createErrorDetail,
  createMultiStatusResponse,
  createSuccessDetail
} from '../types/enhanced-response.types.ts';
import { Platform } from '../types/platform.types.ts';
import {
  CreatePostRequest,
  DeletePostRequest,
  LikePostRequest,
  QuotePostRequest,
  ReplyToPostRequest,
  RepostRequest,
  UnlikePostRequest,
} from '../types/post.types.ts';
import { MediaCache } from '../utils/media-cache.utils.ts';
import { verifyPlatformAccess } from '../utils/near-auth.utils.ts';
import { addContentVariation, getPostDelay } from '../utils/spam-detection.utils.ts';

/**
 * Post Controller
 * Handles HTTP requests for post-related operations
 */
export class PostController {
  private postService: PostService;
  private rateLimitService: RateLimitService;
  private activityTrackingService: ActivityTrackingService;

  constructor() {
    const env = getEnv();
    this.postService = new PostService(env);
    this.rateLimitService = new RateLimitService(env);
    this.activityTrackingService = new ActivityTrackingService(env);
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

      // Initialize success and error arrays for multi-status response
      const successResults: Array<ReturnType<typeof createSuccessDetail>> = [];
      const errorDetails: Array<ReturnType<typeof createErrorDetail>> = [];

      // Initialize media cache for this operation
      const mediaCache = MediaCache.getInstance();
      mediaCache.clearCache();

      // Process targets sequentially
      for (let i = 0; i < request.targets.length; i++) {
        const target = request.targets[i];
        try {
          const { platform, userId } = target;

          try {
            // Verify platform access
            await verifyPlatformAccess(signerId, platform, userId);
          } catch (error) {
            // Create a platform error for unauthorized access
            errorDetails.push(
              createErrorDetail(
                error instanceof Error
                  ? error.message
                  : `No connected ${platform} account found for user ID ${userId}`,
                ApiErrorCode.UNAUTHORIZED,
                platform,
                userId,
                true // Recoverable by connecting the account
              )
            );
            continue;
          }

          // Check rate limits before posting using the platform-agnostic method
          const canPost = await this.rateLimitService.canPerformAction(platform, 'post');
          if (!canPost) {
            // Create a platform error for rate limiting
            errorDetails.push(
              createErrorDetail(
                `Rate limit reached for ${platform}. Please try again later.`,
                ApiErrorCode.RATE_LIMITED,
                platform,
                userId,
                true // Recoverable by waiting
              )
            );
            continue;
          }

          // Add content variation to avoid duplicate content detection
          const modifiedContent = addContentVariation(request.content, i);

          // Create the post
          const result = await this.postService.createPost(
            platform,
            userId,
            modifiedContent,
          );

          // Add to success results
          successResults.push(
            createSuccessDetail(
              platform,
              userId,
              {
                postId: result.id,
                postUrl: result.url || `https://twitter.com/i/web/status/${result.id}`, // Fallback URL format
                createdAt: result.createdAt,
                threadIds: result.threadIds,
              }
            )
          );

          // Track the post for activity tracking
          await this.activityTrackingService.trackPost(
            signerId,
            platform,
            userId,
            result.id, // The post ID from the platform
          );

          // Add a small delay between posts to avoid spam detection
          if (i < request.targets.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, getPostDelay(platform)));
          }
        } catch (error) {
          // Handle platform-specific errors
          if (error instanceof PlatformError) {
            errorDetails.push(
              createErrorDetail(
                error.message,
                error.code,
                error.platform as any, // Type cast needed due to platform string vs enum
                error.userId || target.userId,
                error.recoverable,
                error.details
              )
            );
          }
          // Handle Twitter-specific errors
          else if (error instanceof TwitterError) {
            errorDetails.push(
              createErrorDetail(
                error.message,
                error.code,
                Platform.TWITTER,
                target.userId,
                error.recoverable,
                error.details
              )
            );
          }
          // Handle generic errors
          else {
            errorDetails.push(
              createErrorDetail(
                error instanceof Error ? error.message : 'An unexpected error occurred',
                ApiErrorCode.PLATFORM_ERROR,
                target.platform,
                target.userId,
                false
              )
            );
          }
        }
      }

      // Clear the media cache after all posts are processed
      mediaCache.clearCache();

      // Create a multi-status response
      const response = createMultiStatusResponse(successResults, errorDetails);

      // Determine appropriate status code
      let statusCode = 200;
      if (successResults.length === 0 && errorDetails.length > 0) {
        // Complete failure - use the first error's status code
        statusCode = 400; // Default to 400 Bad Request
      } else if (successResults.length > 0 && errorDetails.length > 0) {
        // Partial success - use 207 Multi-Status
        statusCode = 207;
      }

      // Return the response with appropriate status code
      c.status(statusCode as any);
      return c.json(response);
    } catch (error) {
      console.error('Error creating post:', error);

      // Handle unexpected errors
      if (error instanceof Error) {
        c.status(500);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error.message,
              ApiErrorCode.INTERNAL_ERROR,
              undefined,
              undefined,
              false
            ),
          ])
        );
      }

      // Handle unknown errors
      c.status(500);
      return c.json(
        createEnhancedErrorResponse([
          createErrorDetail(
            'An unexpected error occurred',
            ApiErrorCode.UNKNOWN_ERROR,
            undefined,
            undefined,
            false
          ),
        ])
      );
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

      try {
        // Verify platform access
        await verifyPlatformAccess(signerId, body.platform, body.userId);
      } catch (error) {
        // Create a platform error for unauthorized access
        c.status(401);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error instanceof Error
                ? error.message
                : `No connected ${body.platform} account found for user ID ${body.userId}`,
              ApiErrorCode.UNAUTHORIZED,
              body.platform,
              body.userId,
              true // Recoverable by connecting the account
            ),
          ])
        );
      }

      // Check rate limits before reposting
      const canRepost = await this.rateLimitService.canPerformAction(body.platform, 'retweet');
      if (!canRepost) {
        c.status(429);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              `Rate limit reached for ${body.platform}. Please try again later.`,
              ApiErrorCode.RATE_LIMITED,
              body.platform,
              body.userId,
              true // Recoverable by waiting
            ),
          ])
        );
      }

      // Repost the post
      const repostResult = await this.postService.repost(body.platform, body.userId, body.postId);

      // Return the result
      return c.json(
        createEnhancedApiResponse(
          createSuccessDetail(
            body.platform,
            body.userId,
            {
              postId: repostResult.id,
              success: repostResult.success,
            }
          )
        )
      );
    } catch (error) {
      console.error('Error reposting:', error);

      // Handle platform-specific errors
      if (error instanceof PlatformError) {
        c.status(error.status as any);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error.message,
              error.code,
              error.platform as any,
              error.userId,
              error.recoverable,
              error.details
            ),
          ])
        );
      }
      // Handle Twitter-specific errors
      else if (error instanceof TwitterError) {
        c.status(error.status as any);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error.message,
              error.code,
              Platform.TWITTER,
              error.userId,
              error.recoverable,
              error.details
            ),
          ])
        );
      }

      // Handle generic errors
      c.status(500);
      return c.json(
        createEnhancedErrorResponse([
          createErrorDetail(
            error instanceof Error ? error.message : 'An unexpected error occurred',
            ApiErrorCode.INTERNAL_ERROR,
            undefined,
            undefined,
            false
          ),
        ])
      );
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

      try {
        // Verify platform access
        await verifyPlatformAccess(signerId, request.platform, request.userId);
      } catch (error) {
        // Create a platform error for unauthorized access
        c.status(401);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error instanceof Error
                ? error.message
                : `No connected ${request.platform} account found for user ID ${request.userId}`,
              ApiErrorCode.UNAUTHORIZED,
              request.platform,
              request.userId,
              true // Recoverable by connecting the account
            ),
          ])
        );
      }

      // Check rate limits before quoting
      const canQuote = await this.rateLimitService.canPerformAction(request.platform, 'post');
      if (!canQuote) {
        c.status(429);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              `Rate limit reached for ${request.platform}. Please try again later.`,
              ApiErrorCode.RATE_LIMITED,
              request.platform,
              request.userId,
              true // Recoverable by waiting
            ),
          ])
        );
      }

      // Quote the post
      const result = await this.postService.quotePost(
        request.platform,
        request.userId,
        request.postId,
        request.content,
      );

      // Return the result
      return c.json(
        createEnhancedApiResponse(
          createSuccessDetail(
            request.platform,
            request.userId,
            {
              postId: result.id,
              postUrl: result.url || `https://twitter.com/i/web/status/${result.id}`,
              createdAt: result.createdAt,
              quotedPostId: request.postId,
            }
          )
        )
      );
    } catch (error) {
      console.error('Error quoting post:', error);

      // Handle platform-specific errors
      if (error instanceof PlatformError) {
        c.status(error.status as any);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error.message,
              error.code,
              error.platform as any,
              error.userId,
              error.recoverable,
              error.details
            ),
          ])
        );
      }
      // Handle Twitter-specific errors
      else if (error instanceof TwitterError) {
        c.status(error.status as any);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error.message,
              error.code,
              Platform.TWITTER,
              error.userId,
              error.recoverable,
              error.details
            ),
          ])
        );
      }

      // Handle generic errors
      c.status(500);
      return c.json(
        createEnhancedErrorResponse([
          createErrorDetail(
            error instanceof Error ? error.message : 'An unexpected error occurred',
            ApiErrorCode.INTERNAL_ERROR,
            undefined,
            undefined,
            false
          ),
        ])
      );
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

      try {
        // Verify platform access
        await verifyPlatformAccess(signerId, body.platform, body.userId);
      } catch (error) {
        // Create a platform error for unauthorized access
        c.status(401);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error instanceof Error
                ? error.message
                : `No connected ${body.platform} account found for user ID ${body.userId}`,
              ApiErrorCode.UNAUTHORIZED,
              body.platform,
              body.userId,
              true // Recoverable by connecting the account
            ),
          ])
        );
      }

      // Delete the post
      const deleteResult = await this.postService.deletePost(
        body.platform,
        body.userId,
        body.postId,
      );

      // Return the result
      return c.json(
        createEnhancedApiResponse(
          createSuccessDetail(
            body.platform,
            body.userId,
            {
              postId: body.postId,
              success: deleteResult.success,
            }
          )
        )
      );
    } catch (error) {
      console.error('Error deleting post:', error);

      // Handle platform-specific errors
      if (error instanceof PlatformError) {
        c.status(error.status as any);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error.message,
              error.code,
              error.platform as any,
              error.userId,
              error.recoverable,
              error.details
            ),
          ])
        );
      }
      // Handle Twitter-specific errors
      else if (error instanceof TwitterError) {
        c.status(error.status as any);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error.message,
              error.code,
              Platform.TWITTER,
              error.userId,
              error.recoverable,
              error.details
            ),
          ])
        );
      }

      // Handle generic errors
      c.status(500);
      return c.json(
        createEnhancedErrorResponse([
          createErrorDetail(
            error instanceof Error ? error.message : 'An unexpected error occurred',
            ApiErrorCode.INTERNAL_ERROR,
            undefined,
            undefined,
            false
          ),
        ])
      );
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

      try {
        // Verify platform access
        await verifyPlatformAccess(signerId, request.platform, request.userId);
      } catch (error) {
        // Create a platform error for unauthorized access
        c.status(401);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error instanceof Error
                ? error.message
                : `No connected ${request.platform} account found for user ID ${request.userId}`,
              ApiErrorCode.UNAUTHORIZED,
              request.platform,
              request.userId,
              true // Recoverable by connecting the account
            ),
          ])
        );
      }

      // Check rate limits before replying
      const canReply = await this.rateLimitService.canPerformAction(request.platform, 'post');
      if (!canReply) {
        c.status(429);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              `Rate limit reached for ${request.platform}. Please try again later.`,
              ApiErrorCode.RATE_LIMITED,
              request.platform,
              request.userId,
              true // Recoverable by waiting
            ),
          ])
        );
      }

      // Reply to the post
      const result = await this.postService.replyToPost(
        request.platform,
        request.userId,
        request.postId,
        request.content,
      );

      // Return the result
      return c.json(
        createEnhancedApiResponse(
          createSuccessDetail(
            request.platform,
            request.userId,
            {
              postId: result.id,
              postUrl: result.url || `https://twitter.com/i/web/status/${result.id}`,
              createdAt: result.createdAt,
              inReplyToId: request.postId,
            }
          )
        )
      );
    } catch (error) {
      console.error('Error replying to post:', error);

      // Handle platform-specific errors
      if (error instanceof PlatformError) {
        c.status(error.status as any);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error.message,
              error.code,
              error.platform as any,
              error.userId,
              error.recoverable,
              error.details
            ),
          ])
        );
      }
      // Handle Twitter-specific errors
      else if (error instanceof TwitterError) {
        c.status(error.status as any);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error.message,
              error.code,
              Platform.TWITTER,
              error.userId,
              error.recoverable,
              error.details
            ),
          ])
        );
      }

      // Handle generic errors
      c.status(500);
      return c.json(
        createEnhancedErrorResponse([
          createErrorDetail(
            error instanceof Error ? error.message : 'An unexpected error occurred',
            ApiErrorCode.INTERNAL_ERROR,
            undefined,
            undefined,
            false
          ),
        ])
      );
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

      try {
        // Verify platform access
        await verifyPlatformAccess(signerId, body.platform, body.userId);
      } catch (error) {
        // Create a platform error for unauthorized access
        c.status(401);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error instanceof Error
                ? error.message
                : `No connected ${body.platform} account found for user ID ${body.userId}`,
              ApiErrorCode.UNAUTHORIZED,
              body.platform,
              body.userId,
              true // Recoverable by connecting the account
            ),
          ])
        );
      }

      // Check rate limits before liking
      const canLike = await this.rateLimitService.canPerformAction(body.platform, 'like');
      if (!canLike) {
        c.status(429);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              `Rate limit reached for ${body.platform}. Please try again later.`,
              ApiErrorCode.RATE_LIMITED,
              body.platform,
              body.userId,
              true // Recoverable by waiting
            ),
          ])
        );
      }

      // Like the post
      const likeResult = await this.postService.likePost(body.platform, body.userId, body.postId);

      // Return the result
      return c.json(
        createEnhancedApiResponse(
          createSuccessDetail(
            body.platform,
            body.userId,
            {
              postId: body.postId,
              success: likeResult.success,
            }
          )
        )
      );
    } catch (error) {
      console.error('Error liking post:', error);

      // Handle platform-specific errors
      if (error instanceof PlatformError) {
        c.status(error.status as any);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error.message,
              error.code,
              error.platform as any,
              error.userId,
              error.recoverable,
              error.details
            ),
          ])
        );
      }
      // Handle Twitter-specific errors
      else if (error instanceof TwitterError) {
        c.status(error.status as any);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error.message,
              error.code,
              Platform.TWITTER,
              error.userId,
              error.recoverable,
              error.details
            ),
          ])
        );
      }

      // Handle generic errors
      c.status(500);
      return c.json(
        createEnhancedErrorResponse([
          createErrorDetail(
            error instanceof Error ? error.message : 'An unexpected error occurred',
            ApiErrorCode.INTERNAL_ERROR,
            undefined,
            undefined,
            false
          ),
        ])
      );
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

      try {
        // Verify platform access
        await verifyPlatformAccess(signerId, body.platform, body.userId);
      } catch (error) {
        // Create a platform error for unauthorized access
        c.status(401);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error instanceof Error
                ? error.message
                : `No connected ${body.platform} account found for user ID ${body.userId}`,
              ApiErrorCode.UNAUTHORIZED,
              body.platform,
              body.userId,
              true // Recoverable by connecting the account
            ),
          ])
        );
      }

      // Check rate limits before unliking
      const canUnlike = await this.rateLimitService.canPerformAction(body.platform, 'like');
      if (!canUnlike) {
        c.status(429);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              `Rate limit reached for ${body.platform}. Please try again later.`,
              ApiErrorCode.RATE_LIMITED,
              body.platform,
              body.userId,
              true // Recoverable by waiting
            ),
          ])
        );
      }

      // Unlike the post
      const unlikeResult = await this.postService.unlikePost(
        body.platform,
        body.userId,
        body.postId,
      );

      // Return the result
      return c.json(
        createEnhancedApiResponse(
          createSuccessDetail(
            body.platform,
            body.userId,
            {
              postId: body.postId,
              success: unlikeResult.success,
            }
          )
        )
      );
    } catch (error) {
      console.error('Error unliking post:', error);

      // Handle platform-specific errors
      if (error instanceof PlatformError) {
        c.status(error.status as any);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error.message,
              error.code,
              error.platform as any,
              error.userId,
              error.recoverable,
              error.details
            ),
          ])
        );
      }
      // Handle Twitter-specific errors
      else if (error instanceof TwitterError) {
        c.status(error.status as any);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              error.message,
              error.code,
              Platform.TWITTER,
              error.userId,
              error.recoverable,
              error.details
            ),
          ])
        );
      }

      // Handle generic errors
      c.status(500);
      return c.json(
        createEnhancedErrorResponse([
          createErrorDetail(
            error instanceof Error ? error.message : 'An unexpected error occurred',
            ApiErrorCode.INTERNAL_ERROR,
            undefined,
            undefined,
            false
          ),
        ])
      );
    }
  }
}
