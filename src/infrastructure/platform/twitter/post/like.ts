import { LikeResult } from '@crosspost/types';
import { TwitterError } from '../twitter-error.ts';
import { TwitterPostBase } from './base.ts';

export class TwitterLikePost extends TwitterPostBase {
  /**
   * Like a post
   * @param userId The user ID liking the post
   * @param postId The ID of the post to like
   * @returns The like result
   */
  async likePost(userId: string, postId: string): Promise<LikeResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Like the tweet
      const result = await client.v2.like(userId, postId);

      return {
        success: result.data.liked,
        id: postId,
      };
    } catch (error) {
      console.error('Error liking post:', error);
      throw TwitterError.fromTwitterApiError(error);
    }
  }

  /**
   * Unlike a post
   * @param userId The user ID unliking the post
   * @param postId The ID of the post to unlike
   * @returns The unlike result
   */
  async unlikePost(userId: string, postId: string): Promise<LikeResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Unlike the tweet
      const result = await client.v2.unlike(userId, postId);

      return {
        success: !result.data.liked,
        id: postId,
      };
    } catch (error) {
      throw TwitterError.fromTwitterApiError(error);
    }
  }
}
