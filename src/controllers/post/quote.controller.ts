import type { PostResult, QuotePostRequest } from '@crosspost/types';
import { ActivityType } from '@crosspost/types';
import { Context } from '../../../deps.ts';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.ts';
import { AuthService } from '../../domain/services/auth.service.ts';
import { PostService } from '../../domain/services/post.service.ts';
import { RateLimitService } from '../../domain/services/rate-limit.service.ts';
import { createSuccessDetail } from '../../utils/response.utils.ts';
import { BasePostController } from './base.controller.ts';

export class QuoteController extends BasePostController {
  constructor(
    postService: PostService,
    rateLimitService: RateLimitService,
    activityTrackingService: ActivityTrackingService,
    authService: AuthService,
  ) {
    super(postService, rateLimitService, activityTrackingService, authService);
  }

  /**
   * Quote an existing post
   * @param c The Hono context
   * @returns HTTP response
   */
  async handle(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get validated body from context
      const request = c.get('validatedBody') as QuotePostRequest;

      // Process all targets using the base controller method
      const { successResults, errorDetails } = await this.processMultipleTargets(
        signerId,
        request.targets,
        'quote',
        async (target) => {
          // Quote the post
          const result = await this.postService.quotePost(
            request.platform, // Platform of the post being quoted
            target.userId,
            request.postId,
            request.content,
          );

          // Track the post for activity tracking
          await this.activityTrackingService.trackPost(
            signerId,
            target.platform,
            target.userId,
            result.id,
            ActivityType.QUOTE,
          );

          // Return success detail
          return createSuccessDetail<PostResult>(
            target.platform,
            target.userId,
            result,
          );
        },
      );

      // Create a multi-status response using the base controller method
      return this.createMultiStatusResponse(c, successResults, errorDetails);
    } catch (error) {
      return this.handleError(error, c);
    }
  }
}
