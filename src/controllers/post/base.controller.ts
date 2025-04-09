import { 
  ApiErrorCode, 
  PlatformName,
  createEnhancedApiResponse, 
  createEnhancedErrorResponse, 
  createErrorDetail,
  PlatformError
} from '@crosspost/types';
import { Context } from '../../../deps.ts';
import type { StatusCode } from 'hono/utils/http-status';
import { getEnv } from '../../config/env.ts';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.ts';
import { PostService } from '../../domain/services/post.service.ts';
import { RateLimitService } from '../../domain/services/rate-limit.service.ts';
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
    c: Context,
  ): Promise<boolean> {
    try {
      await verifyPlatformAccess(signerId, platform, userId);
      return true;
    } catch (error) {
      // Create a platform error for unauthorized access
      c.status(401);
      c.json(
        createEnhancedApiResponse([
          createErrorDetail(
            error instanceof Error
              ? error.message
              : `No connected ${platform} account found for user ID ${userId}`,
            ApiErrorCode.UNAUTHORIZED,
            true, // Recoverable by connecting the account
            platform,
            userId,
          ),
        ]),
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
    c: Context,
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
          true, // Recoverable by waiting
          platform,
          userId,
        ),
      ]),
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
    userId?: string,
  ): void {
    console.error(`Error in ${this.constructor.name}:`, error);

    // Handle platform-specific errors
    if (error instanceof PlatformError) {
      c.status((error.status || 500) as StatusCode); 
      c.json(
        createEnhancedErrorResponse([
          createErrorDetail(
            error.message,
            error.code,
            error.recoverable,
            error.platform,
            error.userId,
            error.details,
          ),
        ]),
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
          false,
          platform,
          userId,
        ),
      ]),
    );
  }
}
