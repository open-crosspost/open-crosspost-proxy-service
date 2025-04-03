import { createEnhancedApiResponse, createSuccessDetail, UnlikePostRequest } from '@crosspost/types';
import { Context } from '../../../deps.ts';
import { BasePostController } from './base.controller.ts';

/**
 * Unlike Controller
 * Handles unliking a previously liked post
 */
export class UnlikeController extends BasePostController {
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
      const body = c.get('validatedBody') as UnlikePostRequest;

      // Verify platform access
      if (!await this.verifyAccess(signerId, body.platform, body.userId, c)) {
        return c.res;
      }

      // Check rate limits before unliking
      if (!await this.checkRateLimits(body.platform, body.userId, 'like', c)) {
        return c.res;
      }

      // Unlike the post
      const unlikeResult = await this.postService.unlikePost(
        body.platform,
        body.userId,
        body.postId,
      );

      // Return the result
      return c.json(
        createEnhancedApiResponse(
          createSuccessDetail(
            body.platform,
            body.userId,
            {
              postId: body.postId,
              success: unlikeResult.success,
            },
          ),
        ),
      );
    } catch (error) {
      this.handleError(error, c);
      return c.res;
    }
  }
}
