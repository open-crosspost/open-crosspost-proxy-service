import { Context } from '../../../deps.ts';
import type { PostResult, RepostRequest } from '@crosspost/types';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.ts';
import { AuthService } from '../../domain/services/auth.service.ts';
import { PostService } from '../../domain/services/post.service.ts';
import { RateLimitService } from '../../domain/services/rate-limit.service.ts';
import { BasePostController } from './base.controller.ts';
import { createSuccessDetail } from '../../utils/response.utils.ts';
export class RepostController extends BasePostController {
  constructor(
    postService: PostService,
    rateLimitService: RateLimitService,
    activityTrackingService: ActivityTrackingService,
    authService: AuthService,
  ) {
    super(postService, rateLimitService, activityTrackingService, authService);
  }

  /**
   * Repost an existing post
   * @param c The Hono context
   * @returns HTTP response
   */
  async handle(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get validated body from context
      const request = c.get('validatedBody') as RepostRequest;

      // Process all targets using the base controller method
      const { successResults, errorDetails } = await this.processMultipleTargets(
        signerId,
        request.targets,
        'repost',
        async (target) => {
          // Repost the post
          const result = await this.postService.repost(
            request.platform, // Platform of the post being reposted
            target.userId,
            request.postId,
          );

          // Track the post for activity tracking
          await this.activityTrackingService.trackPost(
            signerId,
            target.platform,
            target.userId,
            result.id,
          );

          // Return success detail
          return createSuccessDetail<PostResult>(
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
