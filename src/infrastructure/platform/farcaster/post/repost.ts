import { PostResult } from '@crosspost/types';
import { FarcasterError } from '../farcaster-error.ts';
import { FarcasterPostBase } from './base.ts';

export class FarcasterRecast extends FarcasterPostBase {
  /**
   * Repost/retweet an existing post
   * @param userId The user ID performing the repost
   * @param postId The ID of the post to repost
   * @returns The repost result
   */
  async repost(userId: string, postId: string): Promise<PostResult> {
    try {
      const client = await this.farcasterClient.getClientForUser();

      // Retweet the tweet
      const result = await client.publishReaction({
        signerUuid: userId,
        reactionType: 'recast',
        target: postId,
      });

      return {
        id: result.success ? postId : '',
        createdAt: new Date().toISOString(),
        success: result.success,
      };
    } catch (error) {
      console.error('Error reposting:', error);
      throw FarcasterError.fromNeynarError(error);
    }
  }
}
