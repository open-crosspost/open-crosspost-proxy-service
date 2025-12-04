import { getSecureEnv, isProduction } from './src/config/env.ts';
import { AuthController } from './src/controllers/auth.controller.ts';
import { ActivityController } from './src/controllers/activity.controller.ts';
import {
  CreateController,
  DeleteController,
  LikeController,
  QuoteController,
  ReplyController,
  RepostController,
  UnlikeController,
} from './src/controllers/post/index.ts';
import { RateLimitController } from './src/controllers/rate-limit.controller.ts';
import { ActivityTrackingService } from './src/domain/services/activity-tracking.service.ts';
import { AuthService } from './src/domain/services/auth.service.ts';
import { PostService } from './src/domain/services/post.service.ts';
import { RateLimitService } from './src/domain/services/rate-limit.service.ts';
import { NearAuthService } from './src/infrastructure/security/near-auth-service.ts';
import { TokenAccessLogger } from './src/infrastructure/security/token-access-logger.ts';
import { TokenStorage } from './src/infrastructure/storage/auth-token-storage.ts';
import { PrefixedKvStore } from './src/utils/kv-store.utils.ts';

/**
 * Initialize all dependencies and controllers
 * @returns Initialized controllers
 */
export function initializeApp() {
  // Get environment configuration
  const env = getSecureEnv(isProduction());

  // Initialize KV stores
  const tokenKvStore = new PrefixedKvStore(['tokens']);
  const authStateKvStore = new PrefixedKvStore(['auth']);
  const nearAuthKvStore = new PrefixedKvStore(['near_auth']);
  const tokenAccessLogKvStore = new PrefixedKvStore(['token_access_logs']);
  const usageRateLimitKvStore = new PrefixedKvStore(['usage_rate_limit']);
  const activityKvStore = new PrefixedKvStore(['activity']);

  // Initialize infrastructure services
  const tokenAccessLogger = new TokenAccessLogger(env, tokenAccessLogKvStore);
  const tokenStorage = new TokenStorage(env.ENCRYPTION_KEY, tokenKvStore, tokenAccessLogger);

  const nearAuthService = new NearAuthService(
    tokenStorage,
    nearAuthKvStore,
  );

  // Initialize domain services (now RPC-based)
  const authService = new AuthService(nearAuthService, authStateKvStore);
  const postService = new PostService(nearAuthService);
  const rateLimitService = new RateLimitService(new Map()); // TODO: Implement RPC-based rate limiting
  const activityTrackingService = new ActivityTrackingService(activityKvStore);

  // Initialize controllers
  const authController = new AuthController(authService, nearAuthService);
  const activityController = new ActivityController(activityTrackingService);
  const rateLimitController = new RateLimitController(rateLimitService, usageRateLimitKvStore);

  // Initialize post controllers with dependencies
  const postControllers = {
    create: new CreateController(
      postService,
      rateLimitService,
      activityTrackingService,
      authService,
    ),
    repost: new RepostController(
      postService,
      rateLimitService,
      activityTrackingService,
      authService,
    ),
    quote: new QuoteController(postService, rateLimitService, activityTrackingService, authService),
    delete: new DeleteController(
      postService,
      rateLimitService,
      activityTrackingService,
      authService,
    ),
    reply: new ReplyController(postService, rateLimitService, activityTrackingService, authService),
    like: new LikeController(postService, rateLimitService, activityTrackingService, authService),
    unlike: new UnlikeController(
      postService,
      rateLimitService,
      activityTrackingService,
      authService,
    ),
  };

  return {
    authController,
    activityController,
    rateLimitController,
    postControllers,
    nearAuthService,
  };
}
