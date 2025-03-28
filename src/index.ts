import { Router } from 'itty-router';
import { ExtendedRequest } from './types/request.types';
import { Env as EnvConfig } from './config/env';

// Import controllers
import { AuthController } from './api/controllers/auth.controller';
import { PostController } from './api/controllers/post.controller';
import { MediaController } from './api/controllers/media.controller';
import { RateLimitController } from './api/controllers/rate-limit.controller';

// Import middleware
import { AuthMiddleware } from './api/middleware/auth.middleware';
import { CorsMiddleware } from './api/middleware/cors.middleware';
import { ErrorMiddleware } from './api/middleware/error.middleware';
import { RateLimitMiddleware } from './api/middleware/rate-limit.middleware';

/**
 * Create a new router and configure routes with controllers and middleware
 * @param env Environment variables
 * @returns Configured router
 */
function createRouter(env: EnvConfig) {
  // Create a new router
  const router = Router();
  
  // Create controllers
  const authController = new AuthController(env);
  const postController = new PostController(env);
  const mediaController = new MediaController(env);
  const rateLimitController = new RateLimitController(env);
  
  // Create middleware
  const authMiddleware = new AuthMiddleware(env);
  const corsMiddleware = new CorsMiddleware(env);
  const rateLimitMiddleware = new RateLimitMiddleware(env);
  
  // CORS preflight requests
  router.options('*', (request: Request) => {
    const extendedRequest = request as ExtendedRequest;
    return corsMiddleware.handleCors(extendedRequest);
  });
  
  // Apply CORS to all routes
  router.all('*', (request: Request) => {
    const extendedRequest = request as ExtendedRequest;
    return corsMiddleware.handleCors(extendedRequest);
  });
  
  // Auth routes
  router.post('/auth/init', ErrorMiddleware.withErrorHandling(
    (request: Request) => authController.initializeAuth(request as ExtendedRequest)
  ));
  
  router.post('/auth/callback', ErrorMiddleware.withErrorHandling(
    (request: Request) => authController.handleCallback(request as ExtendedRequest)
  ));
  
  router.post('/auth/refresh', ErrorMiddleware.withErrorHandling(
    async (request: Request) => {
      const extendedRequest = request as ExtendedRequest;
      const nearAuthResponse = await authMiddleware.validateNearAuth(extendedRequest);
      if (nearAuthResponse) return nearAuthResponse;
      return authController.refreshToken(extendedRequest);
    }
  ));
  
  router.delete('/auth/revoke', ErrorMiddleware.withErrorHandling(
    async (request: Request) => {
      const extendedRequest = request as ExtendedRequest;
      const nearAuthResponse = await authMiddleware.validateNearAuth(extendedRequest);
      if (nearAuthResponse) return nearAuthResponse;
      return authController.revokeToken(extendedRequest);
    }
  ));
  
  router.get('/auth/status', ErrorMiddleware.withErrorHandling(
    async (request: Request) => {
      const extendedRequest = request as ExtendedRequest;
      const nearAuthResponse = await authMiddleware.validateNearAuth(extendedRequest);
      if (nearAuthResponse) return nearAuthResponse;
      return authController.hasValidTokens(extendedRequest);
    }
  ));
  
  // Post routes
  router.post('/api/post', ErrorMiddleware.withErrorHandling(
    async (request: Request) => {
      const extendedRequest = request as ExtendedRequest;
      const nearAuthResponse = await authMiddleware.validateNearAuth(extendedRequest);
      if (nearAuthResponse) return nearAuthResponse;
      
      const rateLimitResponse = rateLimitMiddleware.checkRateLimit(extendedRequest, 'post', 60);
      if (rateLimitResponse) return rateLimitResponse;
      
      const userIdResponse = authMiddleware.extractUserId(extendedRequest);
      if (userIdResponse) return userIdResponse;
      
      const response = await postController.createPost(extendedRequest);
      return rateLimitMiddleware.addRateLimitHeaders(response, extendedRequest);
    }
  ));
  
  router.post('/api/repost', ErrorMiddleware.withErrorHandling(
    async (request: Request) => {
      const extendedRequest = request as ExtendedRequest;
      const nearAuthResponse = await authMiddleware.validateNearAuth(extendedRequest);
      if (nearAuthResponse) return nearAuthResponse;
      
      const rateLimitResponse = rateLimitMiddleware.checkRateLimit(extendedRequest, 'repost', 30);
      if (rateLimitResponse) return rateLimitResponse;
      
      const userIdResponse = authMiddleware.extractUserId(extendedRequest);
      if (userIdResponse) return userIdResponse;
      
      const response = await postController.repost(extendedRequest);
      return rateLimitMiddleware.addRateLimitHeaders(response, extendedRequest);
    }
  ));
  
  router.post('/api/quote', ErrorMiddleware.withErrorHandling(
    async (request: Request) => {
      const extendedRequest = request as ExtendedRequest;
      const nearAuthResponse = await authMiddleware.validateNearAuth(extendedRequest);
      if (nearAuthResponse) return nearAuthResponse;
      
      const rateLimitResponse = rateLimitMiddleware.checkRateLimit(extendedRequest, 'quote', 30);
      if (rateLimitResponse) return rateLimitResponse;
      
      const userIdResponse = authMiddleware.extractUserId(extendedRequest);
      if (userIdResponse) return userIdResponse;
      
      const response = await postController.quotePost(extendedRequest);
      return rateLimitMiddleware.addRateLimitHeaders(response, extendedRequest);
    }
  ));
  
  router.delete('/api/post/:id', ErrorMiddleware.withErrorHandling(
    async (request: Request) => {
      const extendedRequest = request as ExtendedRequest;
      const nearAuthResponse = await authMiddleware.validateNearAuth(extendedRequest);
      if (nearAuthResponse) return nearAuthResponse;
      
      const rateLimitResponse = rateLimitMiddleware.checkRateLimit(extendedRequest, 'delete_post', 30);
      if (rateLimitResponse) return rateLimitResponse;
      
      const userIdResponse = authMiddleware.extractUserId(extendedRequest);
      if (userIdResponse) return userIdResponse;
      
      const response = await postController.deletePost(extendedRequest);
      return rateLimitMiddleware.addRateLimitHeaders(response, extendedRequest);
    }
  ));
  
  router.post('/api/reply', ErrorMiddleware.withErrorHandling(
    async (request: Request) => {
      const extendedRequest = request as ExtendedRequest;
      const nearAuthResponse = await authMiddleware.validateNearAuth(extendedRequest);
      if (nearAuthResponse) return nearAuthResponse;
      
      const rateLimitResponse = rateLimitMiddleware.checkRateLimit(extendedRequest, 'reply', 30);
      if (rateLimitResponse) return rateLimitResponse;
      
      const userIdResponse = authMiddleware.extractUserId(extendedRequest);
      if (userIdResponse) return userIdResponse;
      
      const response = await postController.replyToPost(extendedRequest);
      return rateLimitMiddleware.addRateLimitHeaders(response, extendedRequest);
    }
  ));
  
  router.post('/api/like/:id', ErrorMiddleware.withErrorHandling(
    async (request: Request) => {
      const extendedRequest = request as ExtendedRequest;
      const nearAuthResponse = await authMiddleware.validateNearAuth(extendedRequest);
      if (nearAuthResponse) return nearAuthResponse;
      
      const rateLimitResponse = rateLimitMiddleware.checkRateLimit(extendedRequest, 'like', 60);
      if (rateLimitResponse) return rateLimitResponse;
      
      const userIdResponse = authMiddleware.extractUserId(extendedRequest);
      if (userIdResponse) return userIdResponse;
      
      const response = await postController.likePost(extendedRequest);
      return rateLimitMiddleware.addRateLimitHeaders(response, extendedRequest);
    }
  ));
  
  router.delete('/api/like/:id', ErrorMiddleware.withErrorHandling(
    async (request: Request) => {
      const extendedRequest = request as ExtendedRequest;
      const nearAuthResponse = await authMiddleware.validateNearAuth(extendedRequest);
      if (nearAuthResponse) return nearAuthResponse;
      
      const rateLimitResponse = rateLimitMiddleware.checkRateLimit(extendedRequest, 'unlike', 60);
      if (rateLimitResponse) return rateLimitResponse;
      
      const userIdResponse = authMiddleware.extractUserId(extendedRequest);
      if (userIdResponse) return userIdResponse;
      
      const response = await postController.unlikePost(extendedRequest);
      return rateLimitMiddleware.addRateLimitHeaders(response, extendedRequest);
    }
  ));
  
  // Media routes
  router.post('/api/media/upload', ErrorMiddleware.withErrorHandling(
    async (request: Request) => {
      const extendedRequest = request as ExtendedRequest;
      const nearAuthResponse = await authMiddleware.validateNearAuth(extendedRequest);
      if (nearAuthResponse) return nearAuthResponse;
      
      const rateLimitResponse = rateLimitMiddleware.checkRateLimit(extendedRequest, 'media_upload', 30);
      if (rateLimitResponse) return rateLimitResponse;
      
      const userIdResponse = authMiddleware.extractUserId(extendedRequest);
      if (userIdResponse) return userIdResponse;
      
      const response = await mediaController.uploadMedia(extendedRequest);
      return rateLimitMiddleware.addRateLimitHeaders(response, extendedRequest);
    }
  ));
  
  router.get('/api/media/status/:id', ErrorMiddleware.withErrorHandling(
    async (request: Request) => {
      const extendedRequest = request as ExtendedRequest;
      const nearAuthResponse = await authMiddleware.validateNearAuth(extendedRequest);
      if (nearAuthResponse) return nearAuthResponse;
      
      const rateLimitResponse = rateLimitMiddleware.checkRateLimit(extendedRequest, 'media_status', 60);
      if (rateLimitResponse) return rateLimitResponse;
      
      const userIdResponse = authMiddleware.extractUserId(extendedRequest);
      if (userIdResponse) return userIdResponse;
      
      const response = await mediaController.getMediaStatus(extendedRequest);
      return rateLimitMiddleware.addRateLimitHeaders(response, extendedRequest);
    }
  ));
  
  router.post('/api/media/:id/metadata', ErrorMiddleware.withErrorHandling(
    async (request: Request) => {
      const extendedRequest = request as ExtendedRequest;
      const nearAuthResponse = await authMiddleware.validateNearAuth(extendedRequest);
      if (nearAuthResponse) return nearAuthResponse;
      
      const rateLimitResponse = rateLimitMiddleware.checkRateLimit(extendedRequest, 'media_metadata', 60);
      if (rateLimitResponse) return rateLimitResponse;
      
      const userIdResponse = authMiddleware.extractUserId(extendedRequest);
      if (userIdResponse) return userIdResponse;
      
      const response = await mediaController.updateMediaMetadata(extendedRequest);
      return rateLimitMiddleware.addRateLimitHeaders(response, extendedRequest);
    }
  ));
  
  // Rate limit routes
  router.get('/api/rate-limit/:endpoint?', ErrorMiddleware.withErrorHandling(
    async (request: Request) => {
      const extendedRequest = request as ExtendedRequest;
      const nearAuthResponse = await authMiddleware.validateNearAuth(extendedRequest);
      if (nearAuthResponse) return nearAuthResponse;
      
      const response = await rateLimitController.getRateLimitStatus(extendedRequest);
      return rateLimitMiddleware.addRateLimitHeaders(response, extendedRequest);
    }
  ));
  
  router.get('/api/rate-limits', ErrorMiddleware.withErrorHandling(
    async (request: Request) => {
      const extendedRequest = request as ExtendedRequest;
      const nearAuthResponse = await authMiddleware.validateNearAuth(extendedRequest);
      if (nearAuthResponse) return nearAuthResponse;
      
      const response = await rateLimitController.getAllRateLimits();
      return rateLimitMiddleware.addRateLimitHeaders(response, extendedRequest);
    }
  ));
  
  
  // Health check
  router.get('/health', () => new Response('OK', { status: 200 }));
  
  // OpenAPI documentation
  router.get('/api/docs', () => {
    // TODO: Implement OpenAPI documentation endpoint
    return new Response('OpenAPI documentation coming soon', { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  });
  
  // 404 for everything else
  router.all('*', () => new Response('Not Found', { status: 404 }));
  
  return router;
}

// Export a default object containing all handlers
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Add env and ctx to the request object for use in handlers
      const extendedRequest = request as ExtendedRequest;
      extendedRequest.env = env;
      extendedRequest.ctx = ctx;
      
      // Create and configure the router
      const router = createRouter(env);
      
      // Handle the request with the router
      return await router.handle(extendedRequest);
    } catch (error) {
      // Handle any uncaught errors
      return new ErrorMiddleware().handleError(error);
    }
  },
};

// Define the Env interface for TypeScript
export interface Env {
  TOKENS: KVNamespace;
  DB: D1Database;
  TWITTER_CLIENT_ID: string;
  TWITTER_CLIENT_SECRET: string;
  TWITTER_API_KEY: string;
  TWITTER_API_SECRET: string;
  TWITTER_ACCESS_TOKEN: string;
  TWITTER_ACCESS_SECRET: string;
  ENCRYPTION_KEY: string;
  ALLOWED_ORIGINS: string;
  API_KEYS: string;
  ENVIRONMENT: string;
  REDIS_URL?: string;
}
