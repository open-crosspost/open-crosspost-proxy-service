import { Hono } from './deps.ts';
import { getSecureEnv, isProduction } from './src/config/env.ts';
import { AuthMiddleware } from './src/middleware/auth_middleware.ts';
import { corsMiddleware } from './src/middleware/cors_middleware.ts';
import { errorMiddleware } from './src/middleware/error_middleware.ts';

// Import controllers
import { AuthController } from './src/controllers/auth_controller.ts';
import { MediaController } from './src/controllers/media_controller.ts';
import { PostController } from './src/controllers/post_controller.ts';
import { RateLimitController } from './src/controllers/rate_limit_controller.ts';

// Create a new Hono app
const app = new Hono();

// Apply global middleware
app.use('*', errorMiddleware());
app.use('*', corsMiddleware());

// Initialize controllers
const authController = new AuthController();
const postController = new PostController();
const mediaController = new MediaController();
const rateLimitController = new RateLimitController();

// Health check route
app.get('/health', (c) => c.json({ status: 'ok' }));

// API routes
const api = new Hono();

// Main auth router
const auth = new Hono();

// Twitter-specific auth routes
const twitterAuth = new Hono();
twitterAuth.post(
  '/login',
  AuthMiddleware.validateNearSignature(),
  (c) => authController.initializeAuth(c, 'twitter'),
);
twitterAuth.get('/callback', (c) => authController.handleCallback(c, 'twitter'));
twitterAuth.post(
  '/refresh',
  AuthMiddleware.validateNearSignature(),
  (c) => authController.refreshToken(c, 'twitter'),
);
twitterAuth.delete(
  '/revoke',
  AuthMiddleware.validateNearSignature(),
  (c) => authController.revokeToken(c, 'twitter'),
);
twitterAuth.get(
  '/status',
  AuthMiddleware.validateNearSignature(),
  (c) => authController.hasValidTokens(c, 'twitter'),
);

// Mount platform-specific routes to auth router
auth.route('/twitter', twitterAuth);
// more...

// Common auth routes that aren't platform-specific
auth.get(
  '/accounts',
  AuthMiddleware.validateNearSignature(),
  (c) => authController.listConnectedAccounts(c),
);
// Authorize a NEAR account
auth.post('/authorize/near', (c) => authController.authorizeNear(c));
// Unauthorize a NEAR account
auth.delete('/unauthorize/near', (c) => authController.unauthorizeNear(c));

// Post routes
const post = new Hono();
post.post('/', AuthMiddleware.validateNearSignature(), (c) => postController.createPost(c));
post.post('/repost', AuthMiddleware.validateNearSignature(), (c) => postController.repost(c));
post.post('/quote', AuthMiddleware.validateNearSignature(), (c) => postController.quotePost(c));
post.delete('/:id', AuthMiddleware.validateNearSignature(), (c) => postController.deletePost(c));
post.post('/reply', AuthMiddleware.validateNearSignature(), (c) => postController.replyToPost(c));
post.post('/like/:id', AuthMiddleware.validateNearSignature(), (c) => postController.likePost(c));
post.delete(
  '/like/:id',
  AuthMiddleware.validateNearSignature(),
  (c) => postController.unlikePost(c),
);

// Media routes
const media = new Hono();
media.post(
  '/upload',
  AuthMiddleware.validateNearSignature(),
  (c) => mediaController.uploadMedia(c),
);
media.get(
  '/status/:id',
  AuthMiddleware.validateNearSignature(),
  (c) => mediaController.getMediaStatus(c),
);
media.post(
  '/:id/metadata',
  AuthMiddleware.validateNearSignature(),
  (c) => mediaController.updateMediaMetadata(c),
);

// Rate limit routes
const rateLimit = new Hono();
rateLimit.get('/:endpoint?', (c) => rateLimitController.getRateLimitStatus(c));
rateLimit.get('/', (c) => rateLimitController.getAllRateLimits(c));

// Mount routes
api.route('/post', post);
api.route('/media', media);
api.route('/rate-limit', rateLimit);
app.route('/auth', auth);

app.route('/api', api);

const env = getSecureEnv(isProduction());
const port = parseInt(Deno.env.get('PORT') || '8000');

console.log(`Starting server on port ${port}...`);
console.log(`Environment: ${env.ENVIRONMENT}`);

Deno.serve({ port }, app.fetch);
