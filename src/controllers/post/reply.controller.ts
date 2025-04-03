import { Context } from '../../../deps.ts';
import { ReplyToPostRequest, createEnhancedApiResponse, createSuccessDetail } from '@crosspost/types';
import { BasePostController } from './base.controller.ts';

/**
 * Reply Controller
 * Handles replying to an existing post
 */
export class ReplyController extends BasePostController {
  /**
   * Reply to an existing post
   * @param c The Hono context
   * @returns HTTP response
   */
  async handle(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get validated body from context
      const request = c.get('validatedBody') as ReplyToPostRequest;

      // Verify platform access
      if (!await this.verifyAccess(signerId, request.platform, request.userId, c)) {
        return c.res;
      }

      // Check rate limits before replying
      if (!await this.checkRateLimits(request.platform, request.userId, 'post', c)) {
        return c.res;
      }

      // Reply to the post
      const result = await this.postService.replyToPost(
        request.platform,
        request.userId,
        request.postId,
        request.content,
      );

      // Return the result
      return c.json(
        createEnhancedApiResponse(
          createSuccessDetail(
            request.platform,
            request.userId,
            {
              postId: result.id,
              postUrl: result.url || `https://twitter.com/i/web/status/${result.id}`,
              createdAt: result.createdAt,
              inReplyToId: request.postId,
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
