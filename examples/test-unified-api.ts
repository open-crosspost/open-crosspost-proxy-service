/**
 * Test file for the Twitter Proxy SDK
 * 
 * This file demonstrates how to use the Twitter Proxy SDK
 * to interact with the unified tweet API.
 * 
 * To run this file:
 * 1. Update the configuration with your API key and base URL
 * 2. Run with: bun run examples/test-unified-api.ts
 */

import { TwitterProxySDK } from './twitter-proxy-sdk';

// Configuration
const config = {
  baseUrl: 'https://your-twitter-proxy.example.com', // Update with your proxy URL
  apiKey: 'your-api-key' // Update with your API key
};

// Create a new SDK instance
const twitter = new TwitterProxySDK(config);

// Helper function to log responses
function logResponse(label: string, response: any) {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(response, null, 2));
}

// Helper function to pause execution
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the tests
async function runTests() {
  try {
    console.log('Starting Twitter Proxy SDK tests...');
    
    // Test 1: Post a simple tweet
    console.log('\nTest 1: Posting a simple tweet...');
    const simpleTweetResult = await twitter.postText('Testing the unified Twitter API! #TwitterAPI');
    logResponse('Simple Tweet Result', simpleTweetResult);
    
    // Get the tweet ID for use in subsequent tests
    const tweetId = simpleTweetResult.data?.id;
    if (!tweetId) {
      throw new Error('Failed to get tweet ID from response');
    }
    
    // Wait a moment before the next request
    await sleep(1000);
    
    // Test 2: Reply to the tweet
    console.log('\nTest 2: Replying to the tweet...');
    const replyResult = await twitter.reply(tweetId, 'This is a reply to my own tweet using the unified API.');
    logResponse('Reply Result', replyResult);
    
    // Wait a moment before the next request
    await sleep(1000);
    
    // Test 3: Quote the original tweet
    console.log('\nTest 3: Quoting the original tweet...');
    const quoteResult = await twitter.quote(tweetId, 'Quoting my own tweet with the unified API.');
    logResponse('Quote Result', quoteResult);
    
    // Wait a moment before the next request
    await sleep(1000);
    
    // Test 4: Post a thread
    console.log('\nTest 4: Posting a thread...');
    const threadResult = await twitter.tweet([
      { text: '1/3 Testing the unified Twitter API thread functionality!' },
      { text: '2/3 The unified API makes it easy to post threads.' },
      { text: '3/3 Each tweet in the thread can include media, quotes, or be a reply.' }
    ]);
    logResponse('Thread Result', threadResult);
    
    // Wait a moment before the next request
    await sleep(1000);
    
    // Test 5: Like a tweet
    console.log('\nTest 5: Liking the original tweet...');
    const likeResult = await twitter.like(tweetId);
    logResponse('Like Result', likeResult);
    
    // Wait a moment before the next request
    await sleep(1000);
    
    // Test 6: Get the tweet
    console.log('\nTest 6: Getting the tweet...');
    const getTweetResult = await twitter.getTweet(tweetId);
    logResponse('Get Tweet Result', getTweetResult);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Uncomment to run the tests
// runTests();

// Example of how to use the SDK with async/await in your own code
async function exampleUsage() {
  try {
    // Post a tweet
    const tweetResult = await twitter.postText('Hello world!');
    console.log('Tweet posted:', tweetResult);
    
    // Post a thread with a mix of features
    const threadResult = await twitter.tweet([
      { text: 'Starting a new thread about the Twitter API' },
      { 
        text: 'The unified API makes it easy to include media',
        media: [{
          data: 'base64-encoded-image-data',
          mimeType: 'image/jpeg',
          alt_text: 'Screenshot of the Twitter API documentation'
        }]
      },
      { text: 'You can also quote tweets in your thread', quote: 'some-tweet-id' }
    ]);
    console.log('Thread posted:', threadResult);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Uncomment to run the example
// exampleUsage();

// Export the SDK instance for use in other files
export const twitterClient = twitter;
