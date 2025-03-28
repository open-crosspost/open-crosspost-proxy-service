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
auth.post("/init", (c) => authController.initializeAuth(c));
auth.post("/init-with-near", (c) => authController.initializeAuthWithNear(c));
auth.get("/callback", (c) => authController.handleCallback(c));
auth.post("/refresh", (c) => authController.refreshToken(c));
auth.delete("/revoke", (c) => authController.revokeToken(c));
auth.get("/status", (c) => authController.hasValidTokens(c));

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
media.post("/upload", (c) => mediaController.uploadMedia(c));
media.get("/status/:id", (c) => mediaController.getMediaStatus(c));
media.post("/:id/metadata", (c) => mediaController.updateMediaMetadata(c));

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
  console.log("Received callback request at /api/twitter/callback");
  console.log("URL:", c.req.url);
  
  // Log all headers
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((value, key) => {
    headers[key] = value;
  });
  console.log("Headers:", headers);
  
  // Get the origin header to use as a fallback return URL if no returnUrl is provided
  const origin = headers['origin'] || headers['referer'];
  
  // Check if returnUrl is missing from the query parameters
  const url = new URL(c.req.url);
  if (!url.searchParams.has('returnUrl') && origin) {
    // Add the origin as the returnUrl
    url.searchParams.set('returnUrl', origin);
    console.log("Added returnUrl from origin:", origin);
  }
  
  return authController.handleCallback(c);
});

app.route("/api", api);

// Start the server
const env = getEnv();
const port = parseInt(Deno.env.get("PORT") || "8000");

console.log(`Starting server on port ${port}...`);
console.log(`Environment: ${env.ENVIRONMENT}`);

Deno.serve({ port }, app.fetch);
