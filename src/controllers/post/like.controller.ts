import { PlatformError } from '../../errors/platform-error.ts';
import { SuccessDetail } from '../../../packages/types/src/response.ts';
import { ErrorDetail, ApiErrorCode } from '../../../packages/types/src/errors.ts';
import type { LikePostRequest, LikeResult } from '@crosspost/types';
import { Context } from '../../../deps.ts';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.ts';
import { AuthService } from '../../domain/services/auth.service.ts';
import { PostService } from '../../domain/services/post.service.ts';
import { RateLimitService } from '../../domain/services/rate-limit.service.ts';
import { createErrorDetail, createSuccessDetail } from '../../utils/response.utils.ts';
import { BasePostController } from './base.controller.ts';

export class LikeController extends BasePostController {
  constructor(
    postService: PostService,
    rateLimitService: RateLimitService,
    activityTrackingService: ActivityTrackingService,
    authService: AuthService,
  ) {
    super(postService, rateLimitService, activityTrackingService, authService);
  }

  /**
   * Like a post
   * @param c The Hono context
   * @returns HTTP response
   */
  async handle(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get validated body from context
      const request = c.get('validatedBody') as LikePostRequest;

      // Process all targets at once with platform validation
      const { successResults, errorDetails } = await this.processMultipleTargets(
        signerId,
        request.targets,
        'like',
        async (target) => {
          // Like the post
          const result = await this.postService.likePost(
            target.platform,
            target.userId,
            request.postId,
          );

          // Return success detail
          return createSuccessDetail<LikeResult>(
            target.platform,
            target.userId,
            result,
          );
        },
        request.platform // Ensure all targets match the post platform
      );

      return this.createMultiStatusResponse(c, successResults, errorDetails);
    } catch (error) {
      return this.handleError(error, c);
    }
  }
}
