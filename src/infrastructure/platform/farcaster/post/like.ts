// farcaster-like-post.ts
import { LikeResult } from '@crosspost/types';
import { FarcasterPostBase } from './base.ts';

export class FarcasterLikePost extends FarcasterPostBase {
  /**
   * Like a post
   * @param userId The user ID liking the post
   * @param postId The ID of the post to like
   * @returns The like result
   */
  async likePost(userId: string, postId: string): Promise<LikeResult> {
    try {
      const client = await this.farcasterClient.getClientForUser();
      const target = this.resolveTarget(postId);

      const res = await client.publishReaction({
        signerUuid: userId,
        reactionType: 'like',
        target,
      });

      return { success: !!res?.success, id: target };
    } catch (error) {
      console.error('Error liking post:', error);
      throw error;
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
      const client = await this.farcasterClient.getClientForUser();
      const target = this.resolveTarget(postId);

      const res = await client.deleteReaction({
        signerUuid: userId,
        reactionType: 'like',
        target,
      });

      return { success: !!res?.success, id: target };
    } catch (error) {
      console.error('Error unliking post:', error);
      throw error;
    }
  }

  /**
   * Recast a post
   * @param userId The user ID recasting the post
   * @param postId The ID of the post to recast
   * @returns The recast result
   */
  async recastPost(userId: string, postId: string): Promise<LikeResult> {
    try {
      const client = await this.farcasterClient.getClientForUser();
      const target = this.resolveTarget(postId);

      const res = await client.publishReaction({
        signerUuid: userId,
        reactionType: 'recast',
        target,
      });

      return { success: !!res?.success, id: target };
    } catch (error) {
      console.error('Error recasting post:', error);
      throw error;
    }
  }

  /**
   * Undo recast on a post
   * @param userId The user ID undoing the recast
   * @param postId The ID of the post to undo recast
   * @returns The undo recast result
   */
  async unrecastPost(userId: string, postId: string): Promise<LikeResult> {
    try {
      const client = await this.farcasterClient.getClientForUser();
      const target = this.resolveTarget(postId);

      const res = await client.deleteReaction({
        signerUuid: userId,
        reactionType: 'recast',
        target,
      });

      return { success: !!res?.success, id: target };
    } catch (error) {
      console.error('Error undoing recast:', error);
      throw error;
    }
  }

  /** Accepts a hash or a Warpcast URL and returns the target to send to Neynar */
  private resolveTarget(input: string): string {
    if (/^https?:\/\//i.test(input)) return input; // URL targets are allowed
    const m = input.match(/0x[0-9a-fA-F]+/); // cast hash
    return m ? m[0] : input;
  }
}
