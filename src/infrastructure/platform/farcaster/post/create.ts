import { PostContent, PostResult } from '@crosspost/types';
import { FarcasterPostBase } from './base.ts';
import { FarcasterCastParams } from '../types.ts';

export class FarcasterCreatePost extends FarcasterPostBase {
  /**
   * Create a new post
   * @param userId The user ID creating the post
   * @param content The content of the post
   * @returns The created post result
   */
  async createPost(userId: string, content: PostContent | PostContent[]): Promise<PostResult> {
    try {
      const client = await this.farcasterClient.getClientForUser();

      // Handle single post or thread
      if (Array.isArray(content)) {
        // It's a thread
        return this.createThread(userId, content);
      }

      // Build cast params
      const cast: FarcasterCastParams = {
        signerUuid: userId,
        text: content.text || '',
      };

      // Handle media if present (CID -> { url } embeds; Neynar max 2)
      let mediaIds: string[] = [];
      if (content.media?.length) {
        mediaIds = await this.uploadMediaFiles(userId, content.media); // returns CIDs
        this.addEmbedsToCast(cast, mediaIds); // attaches as tuple or omits if none
      }

      const res = await client.publishCast(cast);

      return {
        id: res.cast.hash,
        text: res.cast.text ?? cast.text ?? '',
        createdAt: new Date().toISOString(),
        mediaIds,
      };
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  /**
   * Create a thread of posts
   * @param userId The user ID creating the thread
   * @param contentArray Array of post contents for the thread
   * @returns The thread result
   */
  private async createThread(userId: string, contentArray: PostContent[]): Promise<PostResult> {
    try {
      const client = await this.farcasterClient.getClientForUser(); // or getClientForUser(userId)

      const threadIds: string[] = [];
      let firstHash = '';
      let firstText = '';
      let firstMediaIds: string[] = [];
      let parentHash: string | undefined;

      for (let i = 0; i < contentArray.length; i++) {
        const item = contentArray[i];

        const cast: FarcasterCastParams = {
          signerUuid: userId,
          text: item.text || '',
          ...(parentHash ? { parent: parentHash } : {}),
        };

        let mediaIds: string[] = [];
        if (item.media?.length) {
          mediaIds = await this.uploadMediaFiles(userId, item.media);
          this.addEmbedsToCast(cast, mediaIds);
        }

        const res = await client.publishCast(cast);
        const hash = res.cast.hash;

        if (i === 0) {
          firstHash = hash;
          firstText = res.cast.text ?? cast.text ?? '';
          firstMediaIds = mediaIds;
        }

        threadIds.push(hash);
        parentHash = hash; // chain replies to form a thread
      }

      return {
        id: firstHash,
        text: firstText,
        createdAt: new Date().toISOString(),
        mediaIds: firstMediaIds,
        threadIds,
      };
    } catch (error) {
      console.error('Error creating thread:', error);
      throw error;
    }
  }
}
