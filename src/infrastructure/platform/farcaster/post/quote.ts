import { PostContent, PostResult } from '@crosspost/types';
import { FarcasterPostBase } from './base.ts';
import { FarcasterCastParams, FarcasterEmbed } from '../types.js';

export class FarcasterQuotePost extends FarcasterPostBase {
  /**
   * Quote an existing cast
   * @param userId The user ID quoting the post
   * @param postId The ID of the post to quote
   * @param content The content to add to the quote
   * @returns The quote cast result
   */
  async quotePost(userId: string, postId: string, content: PostContent): Promise<PostResult> {
    try {
      const client = await this.farcasterClient.getClientForUser();

      // Handle thread of quote tweets¬
      if (Array.isArray(content)) {
        return this.createQuoteThread(userId, postId, content);
      }

      // Build quote cast (embed target cast; not a reply)
      const cast: FarcasterCastParams = {
        signerUuid: userId,
        text: content.text ?? '',
        embeds: [] as any,
      };

      // Build the cast embed (needs fid). Fallback: throw if we can't resolve.
      const quoteEmbed = await this.buildQuoteEmbed(client, postId);
      cast.embeds = [quoteEmbed];

      // Handle media if present (CIDs -> { url } embeds, obey max 2 total)
      let mediaIds: string[] = [];
      if (content.media?.length) {
        mediaIds = await this.uploadMediaFiles(userId, content.media);
        this.addEmbedsToCast(cast, mediaIds); // keeps quote embed, caps at 2
      }

      const res = await client.publishCast(cast);

      return {
        id: res.cast.hash,
        text: res.cast.text ?? cast.text ?? '',
        createdAt: new Date().toISOString(),
        mediaIds,
        quotedPostId: postId,
      };
    } catch (error) {
      console.error('Error quoting post:', error);
      throw error;
    }
  }

  /**
   * Create a thread of quote casts
   * @param userId The user ID creating the thread
   * @param postId The ID of the post to quote
   * @param contentArray Array of post contents for the thread
   * @returns The thread result
   */
  private async createQuoteThread(
    userId: string,
    postId: string,
    contentArray: PostContent[],
  ): Promise<PostResult> {
    try {
      const client = await this.farcasterClient.getClientForUser();

      const threadIds: string[] = [];
      let first: { hash: string; text: string; mediaIds: string[] } | null = null;
      let parentHash: string | null = null;

      for (let i = 0; i < contentArray.length; i++) {
        const item = contentArray[i];

        const cast: FarcasterCastParams = {
          signerUuid: userId,
          text: item.text ?? '',
          embeds: [] as any,
        };

        // First cast quotes the target; subsequent casts reply to previous
        if (i === 0) {
          const quoteEmbed = await this.buildQuoteEmbed(client, postId);
          cast.embeds = [quoteEmbed];
        } else if (parentHash) {
          cast.parent = parentHash; // chain the thread
        }

        let mediaIds: string[] = [];
        if (item.media?.length) {
          mediaIds = await this.uploadMediaFiles(userId, item.media);
          this.addEmbedsToCast(cast, mediaIds); // preserves quote embed, max 2
        }

        const res = await client.publishCast(cast);
        const hash = res.cast.hash;

        if (i === 0) {
          first = {
            hash,
            text: res.cast.text ?? cast.text ?? '',
            mediaIds,
          };
        }

        threadIds.push(hash);
        parentHash = hash;
      }

      return {
        id: first?.hash ?? '',
        text: first?.text ?? '',
        createdAt: new Date().toISOString(),
        quotedPostId: postId,
        mediaIds: first?.mediaIds ?? [],
        threadIds,
      };
    } catch (error) {
      console.error('Error creating quote thread:', error);
      throw error;
    }
  }

  // --- helpers ---

  /** Resolve a cast embed using hash → fid lookup; throws if fid can’t be found */
  private async buildQuoteEmbed(
    client: any,
    castHash: string,
  ): Promise<FarcasterEmbed> {
    // If caller passed a URL, just use a URL embed
    if (castHash.startsWith('http://') || castHash.startsWith('https://')) {
      return { url: castHash };
    }

    // Prefer a proper cast reference (hash + fid)
    // Assumes your FarcasterClient exposes a lookup by hash
    // Adjust method name/shape to your client wrapper.
    const cast = await client.getCastByHash?.(castHash);
    const fid = cast?.author?.fid ?? cast?.cast?.author?.fid;

    if (typeof fid === 'number') {
      return { cast_id: { hash: castHash, fid } };
    }

    // If fid cannot be resolved, fail loudly (safer than guessing a Warpcast URL path)
    throw new Error('Cannot quote cast: unable to resolve author fid for provided cast hash');
  }
}
