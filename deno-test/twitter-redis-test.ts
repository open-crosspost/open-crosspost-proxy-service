// Test twitter-api-v2 Redis plugin compatibility with Deno
// Run with: deno run --allow-net --allow-env --allow-read twitter-redis-test.ts

// Import TwitterApi and Redis plugin using imports defined in deno.json
import { TwitterApi } from "twitter-api-v2";
import { TwitterApiCachePluginRedis } from "@twitter-api-v2/plugin-cache-redis";
// Import Upstash Redis at the top level
import { Redis } from "@upstash/redis";

console.log("Successfully imported TwitterApi and Redis plugin");
console.log("Successfully imported @upstash/redis");

// Test creating Redis plugin
try {
  // Mock Redis client with required methods
  const mockRedisClient = {
    get: async (key: string) => null,
    set: async (key: string, value: string, options?: any) => "OK",
    del: async (key: string) => 1
  };
  
  // Create Redis cache plugin
  // @ts-expect-error - Ignore type errors for this test
  const redisCachePlugin = new TwitterApiCachePluginRedis(mockRedisClient);
  console.log("Successfully created TwitterApiCachePluginRedis instance");
  
  // Create Twitter client with plugin
  const twitterClient = new TwitterApi("DUMMY_TOKEN", {
    plugins: [redisCachePlugin]
  });
  console.log("Successfully created TwitterApi instance with Redis plugin");
  
  console.log("\nRedis plugin compatibility test passed!");
} catch (error) {
  console.error("Error during Redis plugin test:", error);
}
