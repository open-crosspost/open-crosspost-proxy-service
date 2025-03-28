// Minimal Deno Twitter Proxy Server
// Run with: deno run --allow-net --allow-env twitter-proxy-server.ts

// Import Oak framework for HTTP server
// Use the standard Deno import for Oak instead of npm compatibility
import { Application, Router } from "https://deno.land/x/oak/mod.ts";
// Import TwitterApi
import { TwitterApi } from "twitter-api-v2";
// Import TwitterApiRateLimitPlugin for rate limiting
import { TwitterApiRateLimitPlugin } from "@twitter-api-v2/plugin-rate-limit";

// Create a new Oak application
const app = new Application();
const router = new Router();

// Create a rate limit plugin
const rateLimitPlugin = new TwitterApiRateLimitPlugin();

// Environment variables (in a real app, these would be set in the environment)
const TWITTER_CLIENT_ID = Deno.env.get("TWITTER_CLIENT_ID") || "DUMMY_CLIENT_ID";
const TWITTER_CLIENT_SECRET = Deno.env.get("TWITTER_CLIENT_SECRET") || "DUMMY_CLIENT_SECRET";

// Simple in-memory token storage (in a real app, use Deno KV or Redis)
const tokenStorage = new Map<string, any>();

// Define routes
router
  .get("/", (ctx) => {
    ctx.response.body = { message: "Deno Twitter Proxy Server" };
  })
  .get("/auth/twitter", (ctx) => {
    // Create a Twitter client
    const client = new TwitterApi({
      clientId: TWITTER_CLIENT_ID,
      clientSecret: TWITTER_CLIENT_SECRET,
    });
    
    // Generate OAuth URL
    const authLink = client.generateOAuth2AuthLink("http://localhost:8000/auth/callback", {
      scope: ["tweet.read", "tweet.write", "users.read", "offline.access"],
      state: "state123", // In a real app, generate a random state
    });
    
    // Return the auth URL
    ctx.response.body = { url: authLink.url };
  })
  .get("/auth/callback", async (ctx) => {
    // Get code from query params
    const code = ctx.request.url.searchParams.get("code");
    const state = ctx.request.url.searchParams.get("state");
    
    if (!code || state !== "state123") {
      ctx.response.status = 400;
      ctx.response.body = { error: "Invalid request" };
      return;
    }
    
    try {
      // Create a Twitter client
      const client = new TwitterApi({
        clientId: TWITTER_CLIENT_ID,
        clientSecret: TWITTER_CLIENT_SECRET,
      });
      
      // Exchange code for token
      const { accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
        code,
        redirectUri: "http://localhost:8000/auth/callback",
        codeVerifier: "", // In a real app, use PKCE
      });
      
      // Get user ID
      const userClient = new TwitterApi(accessToken);
      const { data: user } = await userClient.v2.me();
      
      // Store tokens
      tokenStorage.set(user.id, {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + expiresIn * 1000,
      });
      
      // Return success
      ctx.response.body = { success: true, userId: user.id };
    } catch (error) {
      console.error("Auth error:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Authentication failed" };
    }
  })
  .get("/api/me", async (ctx) => {
    // Get user ID from query params (in a real app, use authentication middleware)
    const userId = ctx.request.url.searchParams.get("userId");
    
    if (!userId || !tokenStorage.has(userId)) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }
    
    try {
      // Get tokens
      const tokens = tokenStorage.get(userId);
      
      // Create Twitter client with rate limit plugin
      const client = new TwitterApi(tokens.accessToken, {
        plugins: [rateLimitPlugin],
      });
      
      // Get user data
      const { data } = await client.v2.me();
      
      // Return user data
      ctx.response.body = { user: data };
    } catch (error) {
      console.error("API error:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "API request failed" };
    }
  });

// Register router
app.use(router.routes());
app.use(router.allowedMethods());

// Start server
const port = 8000;
console.log(`Deno Twitter Proxy Server running on http://localhost:${port}`);
await app.listen({ port });
