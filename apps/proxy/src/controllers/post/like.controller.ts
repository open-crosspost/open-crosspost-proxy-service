import type { LikePostRequest, LikeResult } from '@crosspost/types';
import { Context } from '../../../deps.js';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.js';
import { AuthService } from '../../domain/services/auth.service.js';
import { PostService } from '../../domain/services/post.service.js';
import { RateLimitService } from '../../domain/services/rate-limit.service.js';
import { createSuccessDetail } from '../../utils/response.utils.js';
import { BasePostController } from './base.controller.js';

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

      // Process all targets using the base controller method
      const { successResults, errorDetails } = await this.processMultipleTargets(
        signerId,
        request.targets,
        'like',
        async (target) => {
          // Like the post
          const result = await this.postService.likePost(
            request.platform, // Platform of the post being liked
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
      );

      return this.createMultiStatusResponse(c, successResults, errorDetails);
    } catch (error) {
      return this.handleError(error, c);
    }
  }
}
