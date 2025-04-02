import { Context } from '../../../deps.ts';
import { getEnv } from '../../config/env.ts';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.ts';
import { PostService } from '../../domain/services/post.service.ts';
import { RateLimitService } from '../../domain/services/rate-limit.service.ts';
import { ApiErrorCode, PlatformError } from '../../infrastructure/platform/abstract/error-hierarchy.ts';
import { TwitterError } from '../../infrastructure/platform/twitter/twitter-error.ts';
import {
  createEnhancedErrorResponse,
  createErrorDetail,
} from '../../types/enhanced-response.types.ts';
import { Platform, PlatformName } from '../../types/platform.types.ts';
import { MediaCache } from '../../utils/media-cache.utils.ts';
import { verifyPlatformAccess } from '../../utils/near-auth.utils.ts';

/**
 * Base Post Controller
 * Contains common functionality for all post-related controllers
 */
export abstract class BasePostController {
  protected postService: PostService;
  protected rateLimitService: RateLimitService;
  protected activityTrackingService: ActivityTrackingService;
  protected mediaCache: MediaCache;

  constructor() {
    const env = getEnv();
    this.postService = new PostService(env);
    this.rateLimitService = new RateLimitService(env);
    this.activityTrackingService = new ActivityTrackingService(env);
    this.mediaCache = MediaCache.getInstance();
  }

  /**
   * Verify platform access for a user
   * @param signerId NEAR account ID
   * @param platform Platform name
   * @param userId User ID on the platform
   * @param c Hono context for response
   * @returns true if access is verified, false if an error response was sent
   */
  protected async verifyAccess(
    signerId: string,
    platform: PlatformName,
    userId: string,
    c: Context
  ): Promise<boolean> {
    try {
      await verifyPlatformAccess(signerId, platform, userId);
      return true;
    } catch (error) {
      // Create a platform error for unauthorized access
      c.status(401);
      c.json(
        createEnhancedErrorResponse([
          createErrorDetail(
            error instanceof Error
              ? error.message
              : `No connected ${platform} account found for user ID ${userId}`,
            ApiErrorCode.UNAUTHORIZED,
            platform,
            userId,
            true // Recoverable by connecting the account
          ),
        ])
      );
      return false;
    }
  }

  /**
   * Check rate limits for a specific action
   * @param platform Platform name
   * @param userId User ID on the platform
   * @param action Action to check rate limits for
   * @param c Hono context for response
   * @returns true if rate limits allow the action, false if an error response was sent
   */
  protected async checkRateLimits(
    platform: PlatformName,
    userId: string,
    action: string,
    c: Context
  ): Promise<boolean> {
    const canPerform = await this.rateLimitService.canPerformAction(platform, action);
    if (canPerform) {
      return true;
    }

    c.status(429);
    c.json(
      createEnhancedErrorResponse([
        createErrorDetail(
          `Rate limit reached for ${platform}. Please try again later.`,
          ApiErrorCode.RATE_LIMITED,
          platform,
          userId,
          true // Recoverable by waiting
        ),
      ])
    );
    return false;
  }

  /**
   * Handle errors from platform operations
   * @param error Error to handle
   * @param c Hono context for response
   * @param platform Platform name (for generic errors)
   * @param userId User ID on the platform (for generic errors)
   */
  protected handleError(
    error: unknown,
    c: Context,
    platform?: PlatformName,
    userId?: string
  ): void {
    console.error(`Error in ${this.constructor.name}:`, error);

    // Handle platform-specific errors
    if (error instanceof PlatformError) {
      c.status(error.status as any);
      c.json(
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
      return;
    }
    
    // Handle Twitter-specific errors
    if (error instanceof TwitterError) {
      c.status(error.status as any);
      c.json(
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
      return;
    }

    // Handle generic errors
    c.status(500);
    c.json(
      createEnhancedErrorResponse([
        createErrorDetail(
          error instanceof Error ? error.message : 'An unexpected error occurred',
          ApiErrorCode.INTERNAL_ERROR,
          platform,
          userId,
          false
        ),
      ])
    );
  }
}
