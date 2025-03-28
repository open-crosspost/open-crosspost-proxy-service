// Test twitter-api-v2 plugins compatibility with Deno
// Run with: deno run --allow-net --allow-env --allow-read twitter-plugins-test.ts

// Import TwitterApi and plugins using imports defined in deno.json
import { TwitterApi } from "twitter-api-v2";
import { TwitterApiRateLimitPlugin } from "@twitter-api-v2/plugin-rate-limit";
import { TwitterApiAutoTokenRefresher } from "@twitter-api-v2/plugin-token-refresher";

console.log("Successfully imported TwitterApi and plugins");

// Test creating plugins
try {
  // Create rate limit plugin
  const rateLimitPlugin = new TwitterApiRateLimitPlugin();
  console.log("Successfully created TwitterApiRateLimitPlugin instance");
  
  // Create token refresher plugin
  const tokenRefresher = new TwitterApiAutoTokenRefresher({
    refreshToken: "DUMMY_REFRESH_TOKEN",
    refreshCredentials: {
      clientId: "DUMMY_CLIENT_ID",
      clientSecret: "DUMMY_CLIENT_SECRET"
    },
    onTokenUpdate: (token) => {
      console.log("Token update callback works");
    },
    onTokenRefreshError: (error) => {
      console.log("Token refresh error callback works");
    }
  });
  console.log("Successfully created TwitterApiAutoTokenRefresher instance");
  
  // Create Twitter client with plugins
  const twitterClient = new TwitterApi("DUMMY_TOKEN", {
    plugins: [rateLimitPlugin, tokenRefresher]
  });
  console.log("Successfully created TwitterApi instance with plugins");
  
  console.log("\nPlugins compatibility test passed!");
} catch (error) {
  console.error("Error during plugins test:", error);
}
