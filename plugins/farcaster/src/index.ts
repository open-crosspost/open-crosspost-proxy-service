import { createPlugin } from 'every-plugin';
import { Effect } from 'every-plugin/effect';
import { z } from 'every-plugin/zod';
import { contract } from './contract';
import { FarcasterService } from './service';

/**
 * Farcaster Platform Plugin
 * Implements the platform contract for Farcaster/Neynar social media operations
 */
export default createPlugin({

  variables: z.object({
    ipfsGatewayUrl: z.string().url().default('https://gateway.pinata.cloud/ipfs'),
    timeout: z.number().default(10000),
  }),

  secrets: z.object({
    farcasterDeveloperMnemonic: z.string(),
    neynarApiKey: z.string(),
    pinataJwt: z.string(),
  }),

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      const service = new FarcasterService(
        config.secrets.neynarApiKey,
        config.secrets.farcasterDeveloperMnemonic,
        config.secrets.pinataJwt,
        config.variables.ipfsGatewayUrl,
        config.variables.timeout
      );

      return { service };
    }),

  shutdown: () => Effect.void,

  createRouter: (context, builder) => {
    const { service } = context;

    return builder.router({
      // Auth routes
      auth: builder.auth.router({
        getAuthUrl: builder.auth.getAuthUrl.handler(async ({ input }) => {
          return await Effect.runPromise(service.getAuthUrl(input));
        }),

        exchangeCodeForToken: builder.auth.exchangeCodeForToken.handler(async ({ input }) => {
          return await Effect.runPromise(service.exchangeCodeForToken(input));
        }),

        refreshToken: builder.auth.refreshToken.handler(async ({ input }) => {
          return await Effect.runPromise(service.refreshToken(input));
        }),

        revokeToken: builder.auth.revokeToken.handler(async ({ input }) => {
          return await Effect.runPromise(service.revokeToken(input));
        }),
      }),

      // Post routes
      post: builder.post.router({
        create: builder.post.create.handler(async ({ input }) => {
          return await Effect.runPromise(service.createPost(input));
        }),

        delete: builder.post.delete.handler(async ({ input }) => {
          return await Effect.runPromise(service.deletePost(input));
        }),

        repost: builder.post.repost.handler(async ({ input }) => {
          return await Effect.runPromise(service.repost(input));
        }),

        quote: builder.post.quote.handler(async ({ input }) => {
          return await Effect.runPromise(service.quotePost(input));
        }),

        reply: builder.post.reply.handler(async ({ input }) => {
          return await Effect.runPromise(service.replyToPost(input));
        }),

        like: builder.post.like.handler(async ({ input }) => {
          return await Effect.runPromise(service.likePost(input));
        }),

        unlike: builder.post.unlike.handler(async ({ input }) => {
          return await Effect.runPromise(service.unlikePost(input));
        }),
      }),

      // Media routes
      media: builder.media.router({
        upload: builder.media.upload.handler(async ({ input }) => {
          return await Effect.runPromise(service.uploadMedia(input));
        }),

        getStatus: builder.media.getStatus.handler(async ({ input }) => {
          return await Effect.runPromise(service.getMediaStatus(input));
        }),

        updateMetadata: builder.media.updateMetadata.handler(async ({ input }) => {
          return await Effect.runPromise(service.updateMediaMetadata(input));
        }),
      }),

      // Profile routes
      profile: builder.profile.router({
        get: builder.profile.get.handler(async ({ input }) => {
          return await Effect.runPromise(service.getProfile(input));
        }),
      }),

      // Rate limit routes
      rateLimit: builder.rateLimit.router({
        check: builder.rateLimit.check.handler(async ({ input }) => {
          return await Effect.runPromise(service.checkRateLimit(input));
        }),
      }),
    });
  },
});
