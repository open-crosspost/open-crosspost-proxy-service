import { Router } from 'itty-router';
import { handleCors } from './middleware/cors';
import { validateApiKey } from './middleware/auth';
import { handleErrors } from './middleware/errors';
import { authRoutes } from './handlers/auth';
import { tweetRoutes } from './handlers/tweet';
import { mediaRoutes } from './handlers/media';
import { timelineRoutes } from './handlers/timeline';

// Create a new router
const router = Router();

// CORS preflight requests
router.options('*', handleCors);

// Apply CORS to all routes
router.all('*', handleCors);

// Auth routes
router.post('/auth/init', authRoutes.initAuth);
router.get('/auth/callback', authRoutes.handleCallback);
router.delete('/auth/revoke', validateApiKey, authRoutes.revokeToken);

// Tweet routes
router.post('/api/tweets', validateApiKey, tweetRoutes.unifiedTweet); // New unified endpoint
router.post('/api/tweet', validateApiKey, tweetRoutes.postTweet);
router.post('/api/retweet', validateApiKey, tweetRoutes.retweet);
router.post('/api/quote', validateApiKey, tweetRoutes.quoteTweet);
router.delete('/api/tweet/:id', validateApiKey, tweetRoutes.deleteTweet);
router.post('/api/like/:id', validateApiKey, tweetRoutes.likeTweet);
router.delete('/api/like/:id', validateApiKey, tweetRoutes.unlikeTweet);
router.post('/api/reply', validateApiKey, tweetRoutes.replyToTweet);

// Timeline routes
router.get('/api/timeline', validateApiKey, timelineRoutes.getUserTimeline);
router.get('/api/mentions', validateApiKey, timelineRoutes.getUserMentions);
router.get('/api/likes', validateApiKey, timelineRoutes.getUserLikes);
router.get('/api/tweet/:id', validateApiKey, timelineRoutes.getTweet);

// Media routes
router.post('/api/media/upload', validateApiKey, mediaRoutes.uploadMedia);
router.get('/api/media/status/:id', validateApiKey, mediaRoutes.getMediaStatus);

// Health check
router.get('/health', () => new Response('OK', { status: 200 }));

// 404 for everything else
router.all('*', () => new Response('Not Found', { status: 404 }));

// Export a default object containing all handlers
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Add env and ctx to the request object for use in handlers
      (request as any).env = env;
      (request as any).ctx = ctx;
      
      // Handle the request with the router
      return await router.handle(request);
    } catch (error) {
      // Handle any uncaught errors
      return handleErrors(error);
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
}
