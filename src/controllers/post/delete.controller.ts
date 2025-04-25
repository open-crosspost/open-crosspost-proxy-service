import { createPlatformError, PlatformError } from '../../errors/platform-error.ts';
import { SuccessDetail } from '../../../packages/types/src/response.ts';
import { ErrorDetail, ApiErrorCode } from '../../../packages/types/src/errors.ts';
import type { DeletePostRequest, DeleteResult, Target } from '@crosspost/types';
import { Context } from '../../../deps.ts';
import { ActivityTrackingService } from '../../domain/services/activity-tracking.service.ts';
import { AuthService } from '../../domain/services/auth.service.ts';
import { PostService } from '../../domain/services/post.service.ts';
import { RateLimitService } from '../../domain/services/rate-limit.service.ts';
import { createErrorDetail, createSuccessDetail } from '../../utils/response.utils.ts';
import { BasePostController } from './base.controller.ts';

export class DeleteController extends BasePostController {
  constructor(
    postService: PostService,
    rateLimitService: RateLimitService,
    activityTrackingService: ActivityTrackingService,
    authService: AuthService,
  ) {
    super(postService, rateLimitService, activityTrackingService, authService);
  }

  /**
   * Delete posts
   * @param c The Hono context
   * @returns HTTP response
   */
  async handle(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get validated body from context
      const request = c.get('validatedBody') as DeletePostRequest;

      // Verify that all posts belong to the target
      const invalidPosts = request.posts.filter(
        (post) => post.platform !== request.target.platform || post.userId !== request.target.userId,
      );

      if (invalidPosts.length > 0) {
        const errorDetail = createErrorDetail(
          'All posts must belong to the target platform and user',
          ApiErrorCode.VALIDATION_ERROR,
          false,
          {
            platform: request.target.platform,
            userId: request.target.userId,
            invalidPosts: invalidPosts.map(p => p.postId),
          }
        );
        
        return this.createMultiStatusResponse(c, [], [errorDetail]);
      }

      // Process the single target with all posts
      const { successResult, errorDetail } = await this.processSingleTarget<Target, { successes: DeleteResult[], errors: ErrorDetail[] }>(
        signerId,
        request.target,
        'delete',
        async (target) => {
          // Process each post for this target
          const successes: DeleteResult[] = [];
          const errors: ErrorDetail[] = [];

          for (const post of request.posts) {
            try {
              const result = await this.postService.deletePost(
                post.platform,
                post.userId,
                post.postId,
              );
              
              successes.push(result);
            } catch (error) {
              errors.push(
                createErrorDetail(
                  error instanceof Error ? error.message : 'Unknown error',
                  error instanceof PlatformError ? error.code : ApiErrorCode.PLATFORM_ERROR,
                  error instanceof PlatformError ? error.recoverable : false,
                  {
                    platform: target.platform,
                    userId: target.userId,
                    postId: post.postId,
                    ...((error instanceof PlatformError)
                      ? (error as PlatformError).details
                      : (error instanceof Error ? { errorStack: error.stack } : undefined)),
                  },
                )
              );
            }
          }
          
          return { successes, errors };
        }
      );

      // Handle the results
      if (errorDetail) {
        // If the target itself failed validation/access/rate limits
        return this.createMultiStatusResponse(c, [], [errorDetail]);
      } else if (successResult) {
        // Extract the successes and errors from the processor result
        const successResults = successResult.data.successes.map(result => 
          createSuccessDetail<DeleteResult>(
            request.target.platform,
            request.target.userId,
            result
          )
        );
        
        // Check if there are any errors from the post processing
        if (successResult.data.errors && successResult.data.errors.length > 0) {
          return this.createMultiStatusResponse(c, successResults, successResult.data.errors);
        } else {
          return this.createMultiStatusResponse(c, successResults, []);
        }
      } else {
        // This should never happen, but just in case
        throw new Error('Unexpected state: Neither success nor error result returned');
      }
    } catch (error) {
      return this.handleError(error, c);
    }
  }
}
