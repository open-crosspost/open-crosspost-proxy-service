import { QuotePostRequest, createEnhancedApiResponse, createSuccessDetail } from '@crosspost/types';
import { Context } from '../../../deps.ts';
import { BasePostController } from './base.controller.ts';

/**
 * Quote Post Controller
 * Handles quoting an existing post
 */
export class QuoteController extends BasePostController {
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

      // Verify platform access
      if (!await this.verifyAccess(signerId, request.platform, request.userId, c)) {
        return c.res;
      }

      // Check rate limits before quoting
      if (!await this.checkRateLimits(request.platform, request.userId, 'post', c)) {
        return c.res;
      }

      // Quote the post
      const result = await this.postService.quotePost(
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
              quotedPostId: request.postId,
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
