import { Context } from '../../../deps.ts';
import { ApiErrorCode } from '../../infrastructure/platform/abstract/error-hierarchy.ts';
import { TwitterError } from '../../infrastructure/platform/twitter/twitter-error.ts';
import {
  createEnhancedErrorResponse,
  createErrorDetail,
  createMultiStatusResponse,
  createSuccessDetail,
} from '../../types/enhanced-response.types.ts';
import { Platform } from '../../types/platform.types.ts';
import { CreatePostRequest } from '../../types/post.types.ts';
import { addContentVariation, getPostDelay } from '../../utils/spam-detection.utils.ts';
import { verifyPlatformAccess } from '../../utils/near-auth.utils.ts';
import { BasePostController } from './base.controller.ts';

/**
 * Create Post Controller
 * Handles creating new posts, potentially across multiple platforms
 */
export class CreateController extends BasePostController {
  /**
   * Create a new post
   * @param c The Hono context
   * @returns HTTP response
   */
  async handle(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get validated body from context
      const request = c.get('validatedBody') as CreatePostRequest;

      // Initialize success and error arrays for multi-status response
      const successResults: Array<ReturnType<typeof createSuccessDetail>> = [];
      const errorDetails: Array<ReturnType<typeof createErrorDetail>> = [];

      // Initialize media cache for this operation
      this.mediaCache.clearCache();

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
                true, // Recoverable by connecting the account
              ),
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
                true, // Recoverable by waiting
              ),
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
              },
            ),
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
          if (error instanceof TwitterError) {
            errorDetails.push(
              createErrorDetail(
                error.message,
                error.code,
                Platform.TWITTER,
                target.userId,
                error.recoverable,
                error.details,
              ),
            );
          } // Handle generic errors
          else {
            errorDetails.push(
              createErrorDetail(
                error instanceof Error ? error.message : 'An unexpected error occurred',
                ApiErrorCode.PLATFORM_ERROR,
                target.platform,
                target.userId,
                false,
              ),
            );
          }
        }
      }

      // Clear the media cache after all posts are processed
      this.mediaCache.clearCache();

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
              false,
            ),
          ]),
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
            false,
          ),
        ]),
      );
    }
  }
}
