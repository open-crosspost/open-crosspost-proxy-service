import { createPlatformError, PlatformError } from '../../errors/platform-error.ts';
import { SuccessDetail } from '../../../packages/types/src/response.ts';
import { ErrorDetail, ApiErrorCode } from '../../../packages/types/src/errors.ts';
import type { LikeResult, Target, UnlikePostRequest } from '@crosspost/types';
import { Context } from '../../../deps.ts';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.ts';
import { AuthService } from '../../domain/services/auth.service.ts';
import { PostService } from '../../domain/services/post.service.ts';
import { RateLimitService } from '../../domain/services/rate-limit.service.ts';
import { createErrorDetail, createSuccessDetail } from '../../utils/response.utils.ts';
import { BasePostController } from './base.controller.ts';

export class UnlikeController extends BasePostController {
  constructor(
    postService: PostService,
    rateLimitService: RateLimitService,
    activityTrackingService: ActivityTrackingService,
    authService: AuthService,
  ) {
    super(postService, rateLimitService, activityTrackingService, authService);
  }

  /**
   * Unlike a post
   * @param c The Hono context
   * @returns HTTP response
   */
  async handle(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get validated body from context
      const request = c.get('validatedBody') as UnlikePostRequest;

      // Verify that target platform matches the post platform
      if (request.target.platform !== request.platform) {
        throw createPlatformError(
          ApiErrorCode.VALIDATION_ERROR,
          'Target platform must match post platform',
          request.platform,
          {
            userId: request.target.userId,
            targetPlatform: request.target.platform,
            postPlatform: request.platform,
          },
        );
      }

      // Process the single target
      const { successResult, errorDetail } = await this.processSingleTarget<Target, LikeResult>(
        signerId,
        request.target,
        'unlike', // Use 'unlike' for rate limiting
        async (target) => {
          // Unlike the post
          return await this.postService.unlikePost(
            target.platform,
            target.userId,
            request.postId,
          );
        },
        request.platform, // Ensure target platform matches post platform
      );

      // Create response based on result
      if (errorDetail) {
        return this.createMultiStatusResponse(c, [], [errorDetail]);
      } else if (successResult) {
        return this.createMultiStatusResponse(c, [successResult], []);
      } else {
        // This should never happen, but just in case
        throw new Error('Unexpected state: Neither success nor error result returned');
      }
    } catch (error) {
      return this.handleError(error, c);
    }
  }
}
