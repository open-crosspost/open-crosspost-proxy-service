import { PostContent, PostResult } from '@crosspost/types';
import { FarcasterPostBase } from './base.js';
import { FarcasterCastParams } from '../types.js';

export class FarcasterReplyPost extends FarcasterPostBase {
  /**
   * Reply to an existing cast
   * @param userId The user ID replying to the post
   * @param postId The ID of the post to reply to
   * @param content The content of the reply
   * @returns The reply post result
   */
  async replyToPost(userId: string, postId: string, content: PostContent): Promise<PostResult> {
    try {
      const client = await this.farcasterClient.getClientForUser(); // or getClientForUser(userId)
      if (Array.isArray(content)) {
        return this.createReplyThread(userId, postId, content);
      }

      // Build cast params
      const cast: FarcasterCastParams = {
        signerUuid: userId,
        text: content.text || '',
        parent: postId, // parent is the cast hash you’re replying to
      };

      // Media -> IPFS -> embeds
      let mediaIds: string[] = [];
      if (content.media?.length) {
        mediaIds = await this.uploadMediaFiles(userId, content.media); // returns CIDs
        this.addEmbedsToCast(cast, mediaIds); // maps to { url } embeds, max 2
      }

      const res = await client.publishCast(cast);

      return {
        id: res.cast.hash,
        text: res.cast.text ?? cast.text ?? '',
        createdAt: new Date().toISOString(),
        mediaIds,
        inReplyToId: postId,
      };
    } catch (error) {
      console.error('Error replying to cast:', error);
      throw error;
    }
  }

  /**
   * Create a thread of replies
   * @param userId The user ID creating the thread
   * @param postId The ID of the post to reply to
   * @param contentArray Array of post contents for the thread
   * @returns The thread result
   */
  private async createReplyThread(
    userId: string,
    postId: string,
    contentArray: PostContent[],
  ): Promise<PostResult> {
    try {
      const client = await this.farcasterClient.getClientForUser();
      const threadIds: string[] = [];
      let parentHash = postId;
      let firstRes: { hash: string; text?: string } | null = null;
      let firstMediaIds: string[] = [];

      for (let i = 0; i < contentArray.length; i++) {
        const item = contentArray[i];

        const cast: FarcasterCastParams = {
          signerUuid: userId,
          text: item.text || '',
          parent: parentHash,
        };

        let mediaIds: string[] = [];
        if (item.media?.length) {
          mediaIds = await this.uploadMediaFiles(userId, item.media);
          this.addEmbedsToCast(cast, mediaIds);
        }

        const res = await client.publishCast(cast);
        const hash = res.cast.hash;

        if (i === 0) {
          firstRes = { hash, text: res.cast.text ?? cast.text ?? '' };
          firstMediaIds = mediaIds;
        }

        threadIds.push(hash);
        parentHash = hash; // next reply chains to this one
      }

      return {
        id: firstRes?.hash ?? '',
        text: firstRes?.text ?? '',
        createdAt: new Date().toISOString(),
        inReplyToId: postId,
        mediaIds: firstMediaIds,
        threadIds,
      };
    } catch (error) {
      console.error('Error creating reply thread:', error);
      throw error;
    }
  }
}
