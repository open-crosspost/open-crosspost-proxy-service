import {
  ApiErrorCode,
  errorCodeToStatusCode,
  ErrorDetail,
  PlatformName,
  StatusCode,
} from '@crosspost/types';
import { Context } from '../../../deps.ts';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.ts';
import { AuthService } from '../../domain/services/auth.service.ts';
import { PostService } from '../../domain/services/post.service.ts';
import { RateLimitService } from '../../domain/services/rate-limit.service.ts';
import { PlatformError } from '../../errors/platform-error.ts';
import { MediaCache } from '../../utils/media-cache.utils.ts';
import {
  createErrorDetail,
  createMultiStatusData,
  createSuccessDetail,
  createSuccessResponse,
} from '../../utils/response.utils.ts';
import { getPostDelay } from '../../utils/spam-detection.utils.ts';
import { BaseController } from '../base.controller.ts';

/**
 * Base Post Controller
 * Contains common functionality for all post-related controllers
 */
export abstract class BasePostController extends BaseController {
  protected postService: PostService;
  protected rateLimitService: RateLimitService;
  protected activityTrackingService: ActivityTrackingService;
  protected authService: AuthService;
  protected mediaCache: MediaCache;

  constructor(
    postService: PostService,
    rateLimitService: RateLimitService,
    activityTrackingService: ActivityTrackingService,
    authService: AuthService,
  ) {
    super();
    this.postService = postService;
    this.rateLimitService = rateLimitService;
    this.activityTrackingService = activityTrackingService;
    this.authService = authService;
    this.mediaCache = MediaCache.getInstance();
  }

  /**
   * Verify platform access for a user
   * @param signerId NEAR account ID
   * @param platform Platform name
   * @param userId User ID on the platform
   * @param c Optional Hono context for response (for backward compatibility)
   * @returns Object with success flag and error details if applicable
   */
  protected async verifyAccess(
    signerId: string,
    platform: PlatformName,
    userId: string,
  ): Promise<{ success: boolean; errorDetail?: ErrorDetail }> {
    try {
      // Check if the NEAR account has access to this platform and userId
      const hasAccess = await this.authService.hasAccess(signerId, platform, userId);

      if (!hasAccess) {
        throw new Error(`No connected ${platform} account found for user ID ${userId}`);
      }

      return { success: true };
    } catch (error) {
      // Create a standardized error for unauthorized access
      const errorDetail = createErrorDetail(
        error instanceof Error
          ? error.message
          : `No connected ${platform} account found for user ID ${userId}`,
        ApiErrorCode.UNAUTHORIZED,
        true, // Recoverable by connecting the account
        {
          platform,
          userId,
        },
      );
      return { success: false, errorDetail };
    }
  }

  /**
   * Check rate limits for a specific action
   * @param platform Platform name
   * @param userId User ID on the platform
   * @param action Action to check rate limits for
   * @returns Object with success flag and error details if applicable
   */
  protected async checkRateLimits(
    platform: PlatformName,
    userId: string,
    action: string,
  ): Promise<{ success: boolean; errorDetail?: ReturnType<typeof createErrorDetail> }> {
    const canPerform = await this.rateLimitService.canPerformAction(platform, action);
    if (canPerform) {
      return { success: true };
    }

    const errorDetail = createErrorDetail(
      `Rate limit reached for ${platform}. Please try again later.`,
      ApiErrorCode.RATE_LIMITED,
      true, // Recoverable by waiting
      {
        platform,
        userId,
      },
    );

    return { success: false, errorDetail };
  }

  /**
   * Verify that a target's platform matches the required platform
   * @param target Target with platform and userId
   * @param requiredPlatform Platform that must be matched
   * @returns Object with success flag and error details if applicable
   */
  protected verifyPlatformMatch<T extends { platform: PlatformName; userId: string }>(
    target: T,
    requiredPlatform: PlatformName,
  ): { success: boolean; errorDetail?: ReturnType<typeof createErrorDetail> } {
    if (target.platform !== requiredPlatform) {
      return {
        success: false,
        errorDetail: createErrorDetail(
          `Platform mismatch: Target platform ${target.platform} does not match required platform ${requiredPlatform}`,
          ApiErrorCode.VALIDATION_ERROR,
          false,
          {
            platform: target.platform,
            userId: target.userId,
            requiredPlatform,
          },
        ),
      };
    }
    return { success: true };
  }

    /**
   * Process multiple targets for an operation
   * @param signerId NEAR account ID
   * @param targets Array of operation targets
   * @param action Action type for rate limiting
   * @param processor Function to process each target
   * @param requiredPlatform Optional platform that all targets must match
   * @returns Object with success results and error details
   */
  protected async processMultipleTargets<T extends { platform: PlatformName; userId: string }>(
    signerId: string,
    targets: T[],
    action: string,
    processor: (target: T, index: number) => Promise<any>,
    requiredPlatform?: PlatformName, // Optional parameter for operations that require platform matching
  ): Promise<{
    successResults: ReturnType<typeof createSuccessDetail>[];
    errorDetails: ReturnType<typeof createErrorDetail>[];
  }> {
    const successResults: ReturnType<typeof createSuccessDetail>[] = [];
    const errorDetails: ReturnType<typeof createErrorDetail>[] = [];

    // Initialize media cache for this operation
    this.mediaCache.clearCache();

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      try {
        // If requiredPlatform is provided, verify platform match
        if (requiredPlatform) {
          const platformMatchResult = this.verifyPlatformMatch(target, requiredPlatform);
          if (!platformMatchResult.success && platformMatchResult.errorDetail) {
            errorDetails.push(platformMatchResult.errorDetail);
            continue;
          }
        }

        // Verify platform access
        const accessResult = await this.verifyAccess(signerId, target.platform, target.userId);
        if (!accessResult.success && accessResult.errorDetail) {
          errorDetails.push(accessResult.errorDetail);
          continue;
        }

        // Check rate limits
        const rateLimitResult = await this.checkRateLimits(target.platform, target.userId, action);
        if (!rateLimitResult.success && rateLimitResult.errorDetail) {
          errorDetails.push(rateLimitResult.errorDetail);
          continue;
        }

        // Process the target
        const result = await processor(target, i);
        successResults.push(result);

        // Add a small delay between operations to avoid spam detection
        if (i < targets.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, getPostDelay(target.platform)));
        }
      } catch (error) {
        errorDetails.push(
          createErrorDetail(
            error instanceof Error ? error.message : 'Unknown error',
            error instanceof PlatformError ? error.code : ApiErrorCode.PLATFORM_ERROR,
            error instanceof PlatformError ? error.recoverable : false,
            {
              platform: target.platform,
              userId: target.userId,
              ...((error instanceof PlatformError)
                ? (error as PlatformError).details
                : (error instanceof Error ? { errorStack: error.stack } : undefined)),
            },
          ),
        );
      }
    }

    // Clear the media cache after all targets are processed
    this.mediaCache.clearCache();

    return { successResults, errorDetails };
  }

  /**
   * Process a single target for an operation
   * @param signerId NEAR account ID
   * @param target Target with platform and userId
   * @param action Action type for rate limiting
   * @param processor Function to process the target
   * @param requiredPlatform Optional platform that the target must match
   * @returns Object with success result or error detail
   */
  protected async processSingleTarget<T extends { platform: PlatformName; userId: string }, R>(
    signerId: string,
    target: T,
    action: string,
    processor: (target: T) => Promise<R>,
    requiredPlatform?: PlatformName,
  ): Promise<{
    successResult?: ReturnType<typeof createSuccessDetail<R>>;
    errorDetail?: ReturnType<typeof createErrorDetail>;
  }> {
    try {
      // If requiredPlatform is provided, verify platform match
      if (requiredPlatform) {
        const platformMatchResult = this.verifyPlatformMatch(target, requiredPlatform);
        if (!platformMatchResult.success && platformMatchResult.errorDetail) {
          return { errorDetail: platformMatchResult.errorDetail };
        }
      }

      // Verify platform access
      const accessResult = await this.verifyAccess(signerId, target.platform, target.userId);
      if (!accessResult.success && accessResult.errorDetail) {
        return { errorDetail: accessResult.errorDetail };
      }

      // Check rate limits
      const rateLimitResult = await this.checkRateLimits(target.platform, target.userId, action);
      if (!rateLimitResult.success && rateLimitResult.errorDetail) {
        return { errorDetail: rateLimitResult.errorDetail };
      }

      // Process the target
      const result = await processor(target);
      
      // Return success detail
      return {
        successResult: createSuccessDetail<R>(
          target.platform,
          target.userId,
          result,
        ),
      };
    } catch (error) {
      return {
        errorDetail: createErrorDetail(
          error instanceof Error ? error.message : 'Unknown error',
          error instanceof PlatformError ? error.code : ApiErrorCode.PLATFORM_ERROR,
          error instanceof PlatformError ? error.recoverable : false,
          {
            platform: target.platform,
            userId: target.userId,
            ...((error instanceof PlatformError)
              ? (error as PlatformError).details
              : (error instanceof Error ? { errorStack: error.stack } : undefined)),
          },
        ),
      };
    }
  }

    /**
   * Create appropriate response based on operation results
   * @param c Hono context
   * @param successResults Array of successful operations
   * @param errorDetails Array of error details
   * @returns HTTP response
   */
  protected createMultiStatusResponse(
    c: Context,
    successResults: ReturnType<typeof createSuccessDetail>[],
    errorDetails: ReturnType<typeof createErrorDetail>[],
  ): Response {
    const multiStatusData = createMultiStatusData(successResults, errorDetails);

    // Determine appropriate status code
    let statusCode = 200;
    if (successResults.length === 0 && errorDetails.length > 0) {
      const firstError = errorDetails[0];
      // Cast the errorCode to ApiErrorCode since it's stored as a string in the error detail
      statusCode = errorCodeToStatusCode[firstError.code as ApiErrorCode] || 500;
    } else if (successResults.length > 0 && errorDetails.length > 0) {
      // Partial success - use 207 Multi-Status
      statusCode = 207;
    }

    c.status(statusCode as StatusCode);
    return c.json(createSuccessResponse(c, multiStatusData));
  }
}
