import { DeletePostRequest, createEnhancedApiResponse, createSuccessDetail } from '@crosspost/types';
import { Context } from '../../../deps.ts';
import { BasePostController } from './base.controller.ts';

/**
 * Delete Post Controller
 * Handles deleting an existing post
 */
export class DeleteController extends BasePostController {
  /**
   * Delete a post
   * @param c The Hono context
   * @returns HTTP response
   */
  async handle(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get validated body from context
      const body = c.get('validatedBody') as DeletePostRequest;

      // Verify platform access
      if (!await this.verifyAccess(signerId, body.platform, body.userId, c)) {
        return c.res;
      }

      // Delete the post
      const deleteResult = await this.postService.deletePost(
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
              success: deleteResult.success,
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
