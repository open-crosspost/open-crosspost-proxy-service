import { Hono } from "./deps.ts";
import { getEnv } from "./src/config/env.ts";
import { AuthMiddleware } from "./src/middleware/auth_middleware.ts";
import { corsMiddleware } from "./src/middleware/cors_middleware.ts";
import { errorMiddleware } from "./src/middleware/error_middleware.ts";

// Import controllers
import { AuthController } from "./src/controllers/auth_controller.ts";
import { MediaController } from "./src/controllers/media_controller.ts";
import { PostController } from "./src/controllers/post_controller.ts";
import { RateLimitController } from "./src/controllers/rate_limit_controller.ts";

// Create a new Hono app
const app = new Hono();

// Apply global middleware
app.use("*", errorMiddleware());
app.use("*", corsMiddleware());

// Initialize controllers
const authController = new AuthController();
const postController = new PostController();
const mediaController = new MediaController();
const rateLimitController = new RateLimitController();

// Health check route
app.get("/health", (c) => c.json({ status: "ok" }));

// API routes
const api = new Hono();

// Auth routes
const auth = new Hono();
auth.post("/init", AuthMiddleware.validateNearSignature(), (c) => authController.initializeAuth(c));
auth.get("/callback", AuthMiddleware.validateNearSignature(), (c) => authController.handleCallback(c));
auth.post("/refresh", AuthMiddleware.validateNearSignature(), (c) => authController.refreshToken(c));
auth.delete("/revoke", AuthMiddleware.validateNearSignature(), (c) => authController.revokeToken(c));
auth.get("/status", AuthMiddleware.validateNearSignature(), (c) => authController.hasValidTokens(c));
auth.get("/accounts", AuthMiddleware.validateNearSignature(), (c) => authController.listConnectedAccounts(c));

// Post routes
const post = new Hono();
post.post("/", AuthMiddleware.validateNearSignature(), (c) => postController.createPost(c));
post.post("/repost", AuthMiddleware.validateNearSignature(), (c) => postController.repost(c));
post.post("/quote", AuthMiddleware.validateNearSignature(), (c) => postController.quotePost(c));
post.delete("/:id", AuthMiddleware.validateNearSignature(), (c) => postController.deletePost(c));
post.post("/reply", AuthMiddleware.validateNearSignature(), (c) => postController.replyToPost(c));
post.post("/like/:id", AuthMiddleware.validateNearSignature(), (c) => postController.likePost(c));
post.delete("/like/:id", AuthMiddleware.validateNearSignature(), (c) => postController.unlikePost(c));

// Media routes
const media = new Hono();
media.post("/upload", AuthMiddleware.validateNearSignature(), (c) => mediaController.uploadMedia(c));
media.get("/status/:id", AuthMiddleware.validateNearSignature(),  (c) => mediaController.getMediaStatus(c));
media.post("/:id/metadata", AuthMiddleware.validateNearSignature(),  (c) => mediaController.updateMediaMetadata(c));

// Rate limit routes
const rateLimit = new Hono();
rateLimit.get("/:endpoint?", (c) => rateLimitController.getRateLimitStatus(c));
rateLimit.get("/", (c) => rateLimitController.getAllRateLimits(c));

// Mount routes
api.route("/post", post);
api.route("/media", media);
api.route("/rate-limit", rateLimit);
app.route("/auth", auth);

// Temporary route mapping for /api/twitter/callback to /auth/callback
api.get("/twitter/callback", (c) => {
  return authController.handleCallback(c);
});

app.route("/api", api);

// Start the server
const env = getEnv();
const port = parseInt(Deno.env.get("PORT") || "8000");

console.log(`Starting server on port ${port}...`);
console.log(`Environment: ${env.ENVIRONMENT}`);

Deno.serve({ port }, app.fetch);
