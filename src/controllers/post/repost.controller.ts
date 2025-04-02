import { Context } from '../../../deps.ts';
import {
  createEnhancedApiResponse,
  createSuccessDetail,
} from '../../types/enhanced-response.types.ts';
import { RepostRequest } from '../../types/post.types.ts';
import { BasePostController } from './base.controller.ts';

/**
 * Repost Controller
 * Handles reposting/retweeting an existing post
 */
export class RepostController extends BasePostController {
  /**
   * Repost/retweet an existing post
   * @param c The Hono context
   * @returns HTTP response
   */
  async handle(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get validated body from context
      const body = c.get('validatedBody') as RepostRequest;

      // Verify platform access
      if (!await this.verifyAccess(signerId, body.platform, body.userId, c)) {
        return c.res;
      }

      // Check rate limits before reposting
      if (!await this.checkRateLimits(body.platform, body.userId, 'retweet', c)) {
        return c.res;
      }

      // Repost the post
      const repostResult = await this.postService.repost(body.platform, body.userId, body.postId);

      // Return the result
      return c.json(
        createEnhancedApiResponse(
          createSuccessDetail(
            body.platform,
            body.userId,
            {
              postId: repostResult.id,
              success: repostResult.success,
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
