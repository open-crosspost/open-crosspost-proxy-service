import {
  AccountActivityParamsSchema,
  AccountActivityQuerySchema,
  AccountPostsParamsSchema,
  AccountPostsQuerySchema,
  ActivityLeaderboardQuerySchema,
  AuthCallbackQuerySchema,
  AuthInitRequestSchema,
  AuthTokenRequestSchema,
  CreatePostRequestSchema,
  DeletePostRequestSchema,
  LikePostRequestSchema,
  NearAuthorizationRequestSchema,
  PlatformParamSchema,
  QuotePostRequestSchema,
  RateLimitEndpointParamSchema,
  ReplyToPostRequestSchema,
  RepostRequestSchema,
  UnlikePostRequestSchema,
} from '@crosspost/types';
import { Hono } from './deps.ts';
import { getSecureEnv, isProduction } from './src/config/env.ts';
import { AuthMiddleware } from './src/middleware/auth.middleware.ts';
import { corsMiddleware } from './src/middleware/cors.middleware.ts';
import { errorMiddleware } from './src/middleware/error.middleware.ts';
import { PlatformMiddleware } from './src/middleware/supported-platforms.middleware.ts';
import { RequestContextMiddleware } from './src/middleware/request-context.middleware.ts';
import { UsageRateLimitMiddleware } from './src/middleware/usage-rate-limit.middleware.ts';
import { ValidationMiddleware } from './src/middleware/validation.middleware.ts';
import { initializeApp } from './init.ts';
import { z } from 'zod';

const app = new Hono();

app.use('*', RequestContextMiddleware.initializeContext);
app.use('*', errorMiddleware());
app.use('*', corsMiddleware());

// Initialize environment
const env = getSecureEnv(isProduction());

const {
  authController,
  activityController,
  rateLimitController,
  postControllers,
  nearAuthService,
} = initializeApp(); // initialize services for dependency injection

AuthMiddleware.initialize(nearAuthService);

app.get('/health', (c) => c.json({ status: 'ok' }));

const api = new Hono();
const auth = new Hono();

// Generic platform routes
auth.post(
  '/:platform/login',
  PlatformMiddleware.validatePlatform(),
  ValidationMiddleware.validateParams(PlatformParamSchema),
  ValidationMiddleware.validateBody(AuthInitRequestSchema),
  AuthMiddleware.validateNearSignature(),
  (c) => {
    const platform = PlatformMiddleware.getPlatform(c);
    return authController.initializeAuth(c, platform);
  },
);

auth.get(
  '/:platform/callback',
  PlatformMiddleware.validatePlatform(),
  ValidationMiddleware.validateParams(PlatformParamSchema),
  ValidationMiddleware.validateQuery(AuthCallbackQuerySchema),
  (c) => {
    const platform = PlatformMiddleware.getPlatform(c);
    return authController.handleCallback(c, platform);
  },
);

auth.post(
  '/:platform/refresh',
  PlatformMiddleware.validatePlatform(),
  ValidationMiddleware.validateParams(PlatformParamSchema),
  ValidationMiddleware.validateBody(AuthTokenRequestSchema),
  AuthMiddleware.validateNearSignature(),
  (c) => {
    const platform = PlatformMiddleware.getPlatform(c);
    return authController.refreshToken(c, platform);
  },
);

auth.delete(
  '/:platform/revoke',
  PlatformMiddleware.validatePlatform(),
  ValidationMiddleware.validateParams(PlatformParamSchema),
  ValidationMiddleware.validateBody(AuthTokenRequestSchema),
  AuthMiddleware.validateNearSignature(),
  (c) => {
    const platform = PlatformMiddleware.getPlatform(c);
    return authController.revokeToken(c, platform);
  },
);

auth.get(
  '/:platform/status/:userId',
  PlatformMiddleware.validatePlatform(),
  ValidationMiddleware.validateParams(
    z.object({
      platform: z.string().describe('Social media platform'),
      userId: z.string().describe('User ID on the platform'),
    }).describe('Token status parameters'),
  ),
  AuthMiddleware.validateNearSignature(),
  (c) => {
    const platform = PlatformMiddleware.getPlatform(c);
    return authController.hasValidTokens(c, platform);
  },
);

auth.post(
  '/:platform/refresh-profile',
  PlatformMiddleware.validatePlatform(),
  ValidationMiddleware.validateParams(PlatformParamSchema),
  ValidationMiddleware.validateBody(AuthTokenRequestSchema),
  AuthMiddleware.validateNearSignature(),
  (c) => {
    const platform = PlatformMiddleware.getPlatform(c);
    return authController.refreshUserProfile(c, platform);
  },
);

// Common auth routes that aren't platform-specific
auth.get(
  '/accounts',
  AuthMiddleware.validateNearSignature(),
  (c) => authController.listConnectedAccounts(c),
);
// Authorize a NEAR account
auth.post(
  '/authorize/near',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateBody(NearAuthorizationRequestSchema),
  (c) => authController.authorizeNear(c),
);
// Unauthorize a NEAR account
auth.delete(
  '/unauthorize/near',
  ValidationMiddleware.validateBody(NearAuthorizationRequestSchema),
  AuthMiddleware.validateNearSignature(),
  (c) => authController.unauthorizeNear(c),
);
// Check NEAR account authorization status
auth.get(
  '/authorize/near/status',
  AuthMiddleware.validateNearSignature(),
  (c) => authController.checkNearAuthorizationStatus(c),
);

// Post routes
const post = new Hono();
post.post(
  '/',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateBody(CreatePostRequestSchema),
  UsageRateLimitMiddleware.limitByNearAccount('post'),
  (c) => postControllers.create.handle(c),
);
post.delete(
  '/',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateBody(DeletePostRequestSchema),
  (c) => postControllers.delete.handle(c),
);
post.post(
  '/repost',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateBody(RepostRequestSchema),
  (c) => postControllers.repost.handle(c),
);
post.post(
  '/quote',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateBody(QuotePostRequestSchema),
  (c) => postControllers.quote.handle(c),
);
post.post(
  '/reply',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateBody(ReplyToPostRequestSchema),
  (c) => postControllers.reply.handle(c),
);
post.post(
  '/like',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateBody(LikePostRequestSchema),
  (c) => postControllers.like.handle(c),
);
post.delete(
  '/like',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateBody(UnlikePostRequestSchema),
  (c) => postControllers.unlike.handle(c),
);

// Activity routes
const activity = new Hono();
activity.get(
  '/',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateQuery(ActivityLeaderboardQuerySchema),
  (c) => activityController.getLeaderboard(c),
);
activity.get(
  '/:signerId',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateParams(AccountActivityParamsSchema),
  ValidationMiddleware.validateQuery(AccountActivityQuerySchema),
  (c) => activityController.getAccountActivity(c),
);
activity.get(
  '/:signerId/posts',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateParams(AccountPostsParamsSchema),
  ValidationMiddleware.validateQuery(AccountPostsQuerySchema),
  (c) => activityController.getAccountPosts(c),
);

// Mount routes
api.route('/post', post);
api.route('/activity', activity);
app.route('/auth', auth);

// Usage rate limits (associated with near account)
const usageRateLimit = new Hono();
usageRateLimit.get(
  '/:endpoint?',
  AuthMiddleware.validateNearSignature(),
  ValidationMiddleware.validateParams(RateLimitEndpointParamSchema),
  (c) => rateLimitController.getUsageRateLimit(c),
);
api.route('/rate-limit', usageRateLimit);

app.route('/api', api);

const port = parseInt(Deno.env.get('PORT') || '8000');

// Initialize usage rate limit middleware with configuration
UsageRateLimitMiddleware.initialize({
  maxPostsPerDay: 20, // Configurable limit for posts per day per NEAR account
});

console.log(`Starting server on port ${port}...`);
console.log(`Environment: ${env.ENVIRONMENT}`);

Deno.serve({ port }, app.fetch);
