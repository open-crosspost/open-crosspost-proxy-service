import { DeleteResult } from '@crosspost/types';
import { FarcasterPostBase } from './base.ts';

export class FarcasterDeletePost extends FarcasterPostBase {
  /**
   * Delete a post
   * @param userId The user ID deleting the post
   * @param postId The ID of the post to delete
   * @returns The delete result
   */
  async deletePost(userId: string, postId: string): Promise<DeleteResult> {
    try {
      const client = await this.farcasterClient.getClientForUser(); // or getClientForUser(userId)
      const targetHash = this.extractCastHash(postId);

      const res = await client.deleteCast({
        signerUuid: userId,
        targetHash,
      });

      return {
        success: !!res?.success,
        id: targetHash,
      };
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  /** Accepts a hash or a Warpcast URL and returns the cast hash */
  private extractCastHash(input: string): string {
    if (input.startsWith('0x')) return input;
    const m = input.match(/0x[a-fA-F0-9]+/);
    return m ? m[0] : input;
  }
}
