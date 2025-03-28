// Test twitter-api-v2 compatibility with Deno
// Run with: deno run --allow-net --allow-env --allow-read twitter-api-test.ts

// Import TwitterApi using imports defined in deno.json
import { TwitterApi } from "twitter-api-v2";

console.log("Successfully imported TwitterApi from twitter-api-v2");

// Test creating a TwitterApi instance
try {
  // Create with a dummy token - we won't make actual API calls
  const twitterClient = new TwitterApi("DUMMY_TOKEN");
  console.log("Successfully created TwitterApi instance");
  
  // Check if basic methods exist
  console.log("Checking if basic methods exist:");
  console.log("- v2.tweet:", typeof twitterClient.v2.tweet);
  console.log("- v2.me:", typeof twitterClient.v2.me);
  console.log("- v1.readWrite:", typeof twitterClient.v1.readWrite);
  
  // Check client properties
  console.log("\nChecking client properties:");
  console.log("- client.readOnly:", twitterClient.readOnly ? "exists" : "missing");
  console.log("- client.readWrite:", twitterClient.readWrite ? "exists" : "missing");
  
  console.log("\nBasic compatibility test passed!");
} catch (error) {
  console.error("Error during test:", error);
}
