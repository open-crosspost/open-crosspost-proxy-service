import { createPlugin } from "every-plugin";
import { Effect } from "every-plugin/effect";
import { implement } from "every-plugin/orpc";
import { z } from "every-plugin/zod";
import { contract } from "./contract";
import { CrosspostService } from "./service";
import { NearAuthDataSchema } from "./types/auth";

/**
 * Crosspost Plugin - Social media cross-posting with NEAR authentication
 * 
 * Provides secure social media operations using NEAR wallet authentication
 * instead of traditional OAuth tokens.
 */
export default createPlugin({
  id: "@crosspost/plugin",

  variables: z.object({
    baseUrl: z.string().url().default("https://api.opencrosspost.com"),
    timeout: z.number().min(1000).max(60000).default(10000),
  }),

  secrets: z.object({
    // Store as JSON string, parse into NearAuthData
    nearAuthData: z.string()
      .transform((str) => JSON.parse(str))
      .pipe(NearAuthDataSchema),
  }),

  contract,

  initialize: (config) =>
    Effect.gen(function* () {
      // Create service instance with config
      const service = new CrosspostService(
        config.variables.baseUrl,
        config.secrets.nearAuthData,
        config.variables.timeout
      );

      // Test connection during initialization
      yield* service.getHealthStatus();

      return { service };
    }),

  shutdown: () => Effect.void,

  createRouter: (context) => {
    const { service } = context;
    const os = implement(contract);

    // AUTH HANDLERS
    const authRouter = os.auth.router({
      authorizeNearAccount: os.auth.authorizeNearAccount.handler(async () => {
        return await Effect.runPromise(service.authorizeNearAccount());
      }),
      
      getNearAuthorizationStatus: os.auth.getNearAuthorizationStatus.handler(async () => {
        return await Effect.runPromise(service.getNearAuthorizationStatus());
      }),
      
      loginToPlatform: os.auth.loginToPlatform.handler(async ({ input }) => {
        return await Effect.runPromise(service.loginToPlatform(input.platform, input.options));
      }),
      
      refreshToken: os.auth.refreshToken.handler(async ({ input }) => {
        return await Effect.runPromise(service.refreshToken(input.platform, input.userId));
      }),
      
      refreshProfile: os.auth.refreshProfile.handler(async ({ input }) => {
        return await Effect.runPromise(service.refreshProfile(input.platform, input.userId));
      }),
      
      getAuthStatus: os.auth.getAuthStatus.handler(async ({ input }) => {
        return await Effect.runPromise(service.getAuthStatus(input.platform, input.userId));
      }),
      
      unauthorizeNear: os.auth.unauthorizeNear.handler(async () => {
        return await Effect.runPromise(service.unauthorizeNear());
      }),
      
      revokeAuth: os.auth.revokeAuth.handler(async ({ input }) => {
        return await Effect.runPromise(service.revokeAuth(input.platform, input.userId));
      }),
      
      getConnectedAccounts: os.auth.getConnectedAccounts.handler(async () => {
        return await Effect.runPromise(service.getConnectedAccounts());
      }),
    });

    // POST HANDLERS
    const postRouter = os.post.router({
      create: os.post.create.handler(async ({ input }) => {
        const data = await Effect.runPromise(service.createPost(input));
        return { data };
      }),
      
      delete: os.post.delete.handler(async ({ input }) => {
        const data = await Effect.runPromise(service.deletePost(input));
        return { data };
      }),
      
      repost: os.post.repost.handler(async ({ input }) => {
        const data = await Effect.runPromise(service.repost(input));
        return { data };
      }),
      
      quote: os.post.quote.handler(async ({ input }) => {
        const data = await Effect.runPromise(service.quotePost(input));
        return { data };
      }),
      
      reply: os.post.reply.handler(async ({ input }) => {
        const data = await Effect.runPromise(service.replyToPost(input));
        return { data };
      }),
      
      like: os.post.like.handler(async ({ input }) => {
        const data = await Effect.runPromise(service.likePost(input));
        return { data };
      }),
      
      unlike: os.post.unlike.handler(async ({ input }) => {
        const data = await Effect.runPromise(service.unlikePost(input));
        return { data };
      }),
    });

    // ACTIVITY HANDLERS
    const activityRouter = os.activity.router({
      getLeaderboard: os.activity.getLeaderboard.handler(async ({ input }) => {
        return await Effect.runPromise(service.getLeaderboard(input));
      }),
      
      getAccountActivity: os.activity.getAccountActivity.handler(async ({ input }) => {
        return await Effect.runPromise(service.getAccountActivity(input.signerId, input.query));
      }),
      
      getAccountPosts: os.activity.getAccountPosts.handler(async ({ input }) => {
        return await Effect.runPromise(service.getAccountPosts(input.signerId, input.query));
      }),
    });

    // SYSTEM HANDLERS
    const systemRouter = os.system.router({
      getRateLimits: os.system.getRateLimits.handler(async () => {
        return await Effect.runPromise(service.getRateLimits());
      }),
      
      getEndpointRateLimit: os.system.getEndpointRateLimit.handler(async ({ input }) => {
        return await Effect.runPromise(service.getEndpointRateLimit(input.endpoint));
      }),
      
      getHealthStatus: os.system.getHealthStatus.handler(async () => {
        return await Effect.runPromise(service.getHealthStatus());
      }),
    });

    return os.router({
      auth: authRouter,
      post: postRouter,
      activity: activityRouter,
      system: systemRouter,
    });
  }
});
