import { Effect } from 'every-plugin/effect';
import { ClientFactory } from '../client-factory';
import { MediaAdapter } from './media';
import * as PostSchemas from '@crosspost/platform-contract';
import { FarcasterCastParams, FarcasterEmbed, cidEmbeds } from '../types';
import { mapNeynarError } from '../utils/error-mapping';

export class PostAdapter {
  constructor(
    private clientFactory: ClientFactory,
    private mediaAdapter: MediaAdapter,
    private ipfsGatewayUrl: string
  ) {}

  /**
   * Create a new post (cast)
   * @param input The input parameters for creating a post
   * @returns The created post result
   */
  create(input: PostSchemas.CreatePostInput): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient();
      const signerUuid = input.accessToken; // In Farcaster, accessToken is actually signerUuid

      // Handle single post or thread
      if (Array.isArray(input.content)) {
        return yield* self.createThread(client, signerUuid, input.content);
      }

      return yield* self.createSinglePost(client, signerUuid, input.content);
    });
  }

  /**
   * Delete a post (cast)
   * @param input The input parameters for deleting a post
   * @returns The delete result
   */
  delete(input: PostSchemas.DeletePostInput): Effect.Effect<PostSchemas.DeleteResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient();
      const signerUuid = input.accessToken;
      const targetHash = self.extractCastHash(input.postId);

      yield* Effect.tryPromise({
        try: async () => {
          await client.deleteCast({
            signerUuid,
            targetHash,
          });
        },
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      return {
        success: true,
        id: targetHash
      };
    });
  }

  /**
   * Repost/recast an existing post
   * @param input The input parameters for reposting
   * @returns The repost result
   */
  repost(input: PostSchemas.RepostInput): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient();
      const signerUuid = input.accessToken;
      const target = self.resolveTarget(input.postId);

      const result = yield* Effect.tryPromise({
        try: async () => {
          return await client.publishReaction({
            signerUuid,
            reactionType: 'recast',
            target,
          });
        },
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      return {
        id: input.postId,
        createdAt: new Date().toISOString(),
        success: result?.success || false,
      };
    });
  }

  /**
   * Quote an existing post
   * @param input The input parameters for quoting a post
   * @returns The quote post result
   */
  quote(input: PostSchemas.QuotePostInput): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient();
      const signerUuid = input.accessToken;

      // Handle single quote or thread quote
      if (Array.isArray(input.content)) {
        return yield* self.createQuoteThread(client, signerUuid, input.postId, input.content);
      }

      return yield* self.createQuotePost(client, signerUuid, input.postId, input.content);
    });
  }

  /**
   * Reply to an existing post
   * @param input The input parameters for replying to a post
   * @returns The reply post result
   */
  reply(input: PostSchemas.ReplyInput): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient();
      const signerUuid = input.accessToken;

      // Handle single reply or thread reply
      if (Array.isArray(input.content)) {
        return yield* self.createReplyThread(client, signerUuid, input.postId, input.content);
      }

      return yield* self.createReplyPost(client, signerUuid, input.postId, input.content);
    });
  }

  /**
   * Like a post
   * @param input The input parameters for liking a post
   * @returns The like result
   */
  like(input: PostSchemas.LikeInput): Effect.Effect<PostSchemas.LikeResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient();
      const signerUuid = input.accessToken;
      const target = self.resolveTarget(input.postId);

      const result = yield* Effect.tryPromise({
        try: async () => {
          return await client.publishReaction({
            signerUuid,
            reactionType: 'like',
            target,
          });
        },
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      return {
        success: result?.success || false,
        id: input.postId
      };
    });
  }

  /**
   * Unlike a post
   * @param input The input parameters for unliking a post
   * @returns The unlike result
   */
  unlike(input: PostSchemas.UnlikeInput): Effect.Effect<PostSchemas.LikeResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient();
      const signerUuid = input.accessToken;
      const target = self.resolveTarget(input.postId);

      const result = yield* Effect.tryPromise({
        try: async () => {
          return await client.deleteReaction({
            signerUuid,
            reactionType: 'like',
            target,
          });
        },
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      return {
        success: result?.success || false,
        id: input.postId
      };
    });
  }

  // Private helper methods

  private createSinglePost(
    client: any,
    signerUuid: string,
    content: PostSchemas.PostContent
  ): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const cast: FarcasterCastParams = {
        signerUuid,
        text: content?.text || '',
      };

      // Handle media if present
      let mediaIds: string[] = [];
      if (content.media?.length) {
        // Upload media files
        for (const media of content.media) {
          const uploadResult = yield* self.mediaAdapter.upload({
            userId: signerUuid,
            accessToken: signerUuid,
            media,
          });
          mediaIds.push(uploadResult.mediaId);
        }
        
        // Add embeds (max 2)
        const embeds = cidEmbeds(mediaIds, self.ipfsGatewayUrl);
        if (embeds) {
          cast.embeds = embeds;
        }
      }

      const result = yield* Effect.tryPromise({
        try: async () => await client.publishCast(cast),
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      return {
        id: result.cast.hash,
        text: result.cast.text ?? cast.text ?? '',
        createdAt: new Date().toISOString(),
        mediaIds,
      };
    });
  }

  private createThread(
    client: any,
    signerUuid: string,
    contentArray: PostSchemas.PostContent[]
  ): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const threadIds: string[] = [];
      let firstHash = '';
      let firstText = '';
      let firstMediaIds: string[] = [];
      let parentHash: string | undefined;

      for (let i = 0; i < contentArray.length; i++) {
        const item = contentArray[i];
        if (!item) continue;

        const cast: FarcasterCastParams = {
          signerUuid,
          text: item.text || '',
          ...(parentHash ? { parent: parentHash } : {}),
        };

        let mediaIds: string[] = [];
        if (item.media?.length) {
          for (const media of item.media) {
            const uploadResult = yield* self.mediaAdapter.upload({
              userId: signerUuid,
              accessToken: signerUuid,
              media,
            });
            mediaIds.push(uploadResult.mediaId);
          }
          
          const embeds = cidEmbeds(mediaIds, self.ipfsGatewayUrl);
          if (embeds) {
            cast.embeds = embeds;
          }
        }

        const res = yield* Effect.tryPromise({
          try: async () => await client.publishCast(cast),
          catch: (error) => {
            throw mapNeynarError(error);
          }
        });

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
    });
  }

  private createQuotePost(
    client: any,
    signerUuid: string,
    postId: string,
    content: PostSchemas.PostContent
  ): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      // Build quote cast (embed target cast; not a reply)
      const cast: FarcasterCastParams = {
        signerUuid,
        text: content.text ?? '',
      };

      // Build the cast embed (needs fid). Try to resolve it
      const quoteEmbed = yield* self.buildQuoteEmbed(client, postId);
      cast.embeds = [quoteEmbed];

      // Handle media if present (CIDs -> { url } embeds, obey max 2 total)
      let mediaIds: string[] = [];
      if (content.media?.length) {
        for (const media of content.media) {
          const uploadResult = yield* self.mediaAdapter.upload({
            userId: signerUuid,
            accessToken: signerUuid,
            media,
          });
          mediaIds.push(uploadResult.mediaId);
        }
        
        // Merge media embeds with quote embed (max 2 total)
        const mediaEmbeds = cidEmbeds(mediaIds, self.ipfsGatewayUrl);
        if (mediaEmbeds) {
          const allEmbeds: FarcasterEmbed[] = [quoteEmbed, ...mediaEmbeds].slice(0, 2);
          cast.embeds = allEmbeds as FarcasterCastParams['embeds'];
        }
      }

      const res = yield* Effect.tryPromise({
        try: async () => await client.publishCast(cast),
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      return {
        id: res.cast.hash,
        text: res.cast.text ?? cast.text ?? '',
        createdAt: new Date().toISOString(),
        mediaIds,
        quotedPostId: postId,
      };
    });
  }

  private createQuoteThread(
    client: any,
    signerUuid: string,
    postId: string,
    contentArray: PostSchemas.PostContent[]
  ): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const threadIds: string[] = [];
      let first: { hash: string; text: string; mediaIds: string[] } | null = null;
      let parentHash: string | null = null;

      // Build quote embed once
      const quoteEmbed = yield* self.buildQuoteEmbed(client, postId);

      for (let i = 0; i < contentArray.length; i++) {
        const item = contentArray[i];
        if (!item) continue;

        const cast: FarcasterCastParams = {
          signerUuid,
          text: item.text ?? '',
        };

        // First cast quotes the target; subsequent casts reply to previous
        if (i === 0) {
          cast.embeds = [quoteEmbed];
        } else if (parentHash) {
          cast.parent = parentHash; // chain the thread
        }

        let mediaIds: string[] = [];
        if (item.media?.length) {
          for (const media of item.media) {
            const uploadResult = yield* self.mediaAdapter.upload({
              userId: signerUuid,
              accessToken: signerUuid,
              media,
            });
            mediaIds.push(uploadResult.mediaId);
          }
          
          // Merge media embeds with quote embed (max 2 total)
          const mediaEmbeds = cidEmbeds(mediaIds, self.ipfsGatewayUrl);
          if (mediaEmbeds && i === 0) {
            const allEmbeds: FarcasterEmbed[] = [quoteEmbed, ...mediaEmbeds].slice(0, 2);
            cast.embeds = allEmbeds as FarcasterCastParams['embeds'];
          } else if (mediaEmbeds) {
            cast.embeds = mediaEmbeds;
          }
        }

        const res = yield* Effect.tryPromise({
          try: async () => await client.publishCast(cast),
          catch: (error) => {
            throw mapNeynarError(error);
          }
        });

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
    });
  }

  private createReplyPost(
    client: any,
    signerUuid: string,
    postId: string,
    content: PostSchemas.PostContent
  ): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const cast: FarcasterCastParams = {
        signerUuid,
        text: content.text || '',
        parent: postId, // parent is the cast hash you're replying to
      };

      // Handle media
      let mediaIds: string[] = [];
      if (content.media?.length) {
        for (const media of content.media) {
          const uploadResult = yield* self.mediaAdapter.upload({
            userId: signerUuid,
            accessToken: signerUuid,
            media,
          });
          mediaIds.push(uploadResult.mediaId);
        }
        
        const embeds = cidEmbeds(mediaIds, self.ipfsGatewayUrl);
        if (embeds) {
          cast.embeds = embeds;
        }
      }

      const res = yield* Effect.tryPromise({
        try: async () => await client.publishCast(cast),
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      return {
        id: res.cast.hash,
        text: res.cast.text ?? cast.text ?? '',
        createdAt: new Date().toISOString(),
        mediaIds,
        inReplyToId: postId,
      };
    });
  }

  private createReplyThread(
    client: any,
    signerUuid: string,
    postId: string,
    contentArray: PostSchemas.PostContent[]
  ): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const threadIds: string[] = [];
      let parentHash = postId;
      let firstRes: { hash: string; text?: string } | null = null;
      let firstMediaIds: string[] = [];

      for (let i = 0; i < contentArray.length; i++) {
        const item = contentArray[i];
        if (!item) continue;

        const cast: FarcasterCastParams = {
          signerUuid,
          text: item.text || '',
          parent: parentHash,
        };

        let mediaIds: string[] = [];
        if (item.media?.length) {
          for (const media of item.media) {
            const uploadResult = yield* self.mediaAdapter.upload({
              userId: signerUuid,
              accessToken: signerUuid,
              media,
            });
            mediaIds.push(uploadResult.mediaId);
          }
          
          const embeds = cidEmbeds(mediaIds, self.ipfsGatewayUrl);
          if (embeds) {
            cast.embeds = embeds;
          }
        }

        const res = yield* Effect.tryPromise({
          try: async () => await client.publishCast(cast),
          catch: (error) => {
            throw mapNeynarError(error);
          }
        });

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
    });
  }

  /** Resolve a cast embed using hash → fid lookup; throws if fid can't be found */
  private buildQuoteEmbed(
    client: any,
    castHash: string
  ): Effect.Effect<FarcasterEmbed, Error> {
    return Effect.gen(function* () {
      // If caller passed a URL, just use a URL embed
      if (castHash.startsWith('http://') || castHash.startsWith('https://')) {
        return { url: castHash };
      }

      // Try to get cast info to extract fid
      const cast = yield* Effect.tryPromise({
        try: async () => {
          // Try to fetch cast by hash
          const result = await client.lookUpCastByHash({ hash: castHash });
          if (!result?.cast?.author?.fid) {
            throw new Error('Cast not found or missing author FID');
          }
          return result;
        },
        catch: (error) => {
          // If we can't resolve, fall back to URL embed
          console.warn('Could not resolve cast hash, using URL embed:', error);
          throw error;
        }
      }).pipe(
        Effect.catchAll(() => 
          Effect.succeed({ url: `https://warpcast.com/~/conversations/${castHash}` } as FarcasterEmbed)
        )
      );

      if (cast?.cast?.author?.fid) {
        const fid = typeof cast.cast.author.fid === 'string' 
          ? parseInt(cast.cast.author.fid, 10)
          : cast.cast.author.fid;
        return { cast_id: { hash: castHash, fid } };
      }

      // Fallback: use Warpcast URL
      return { url: `https://warpcast.com/~/conversations/${castHash}` };
    });
  }

  /** Accepts a hash or a Warpcast URL and returns the cast hash */
  private extractCastHash(input: string): string {
    if (input.startsWith('0x')) return input;
    const m = input.match(/0x[a-fA-F0-9]+/);
    return m ? m[0] : input;
  }

  /** Accepts a hash or a Warpcast URL and returns the target to send to Neynar */
  private resolveTarget(input: string): string {
    if (/^https?:\/\//i.test(input)) return input; // URL targets are allowed
    const m = input.match(/0x[0-9a-fA-F]+/); // cast hash
    return m ? m[0] : input;
  }
}
