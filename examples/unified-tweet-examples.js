/**
 * Examples of using the unified tweet API
 * 
 * The new /api/tweets endpoint provides a simplified interface for all tweet operations:
 * - Single tweets
 * - Threaded tweets
 * - Media uploads
 * - Replies
 * - Quote tweets
 * 
 * This file demonstrates various ways to use the API.
 */

// Configuration
const API_BASE_URL = 'https://your-twitter-proxy.example.com';
const API_KEY = 'your-api-key';

// Helper function to make API requests
async function callTwitterAPI(endpoint, data) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify(data)
  });
  
  return await response.json();
}

// Example 1: Simple tweet
async function postSimpleTweet() {
  const tweet = {
    text: 'This is a simple tweet posted via the unified API!'
  };
  
  return await callTwitterAPI('/api/tweets', tweet);
}

// Example 2: Tweet with media
async function postTweetWithMedia() {
  // First, prepare your media data
  // This could be a base64 string or a Blob from a file input
  const imageData = getImageData(); // Your function to get image data
  
  const tweet = {
    text: 'Check out this image!',
    media: [
      {
        data: imageData,
        mimeType: 'image/jpeg',
        alt_text: 'A beautiful landscape photo'
      }
    ]
  };
  
  return await callTwitterAPI('/api/tweets', tweet);
}

// Example 3: Reply to a tweet
async function replyToTweet(tweetId) {
  const tweet = {
    text: 'This is my reply!',
    reply_to: tweetId
  };
  
  return await callTwitterAPI('/api/tweets', tweet);
}

// Example 4: Quote tweet
async function quoteTweet(tweetId) {
  const tweet = {
    text: 'Check out this interesting tweet:',
    quote: tweetId
  };
  
  return await callTwitterAPI('/api/tweets', tweet);
}

// Example 5: Post a thread
async function postThread() {
  const thread = [
    {
      text: '1/4 This is the first tweet in a thread about the unified Twitter API.'
    },
    {
      text: '2/4 The unified API makes it easy to post threads, with or without media.'
    },
    {
      text: '3/4 You can include media in any tweet in the thread.',
      media: [
        {
          data: getImageData(), // Your function to get image data
          mimeType: 'image/jpeg'
        }
      ]
    },
    {
      text: '4/4 And that\'s how simple it is to use the unified Twitter API!'
    }
  ];
  
  return await callTwitterAPI('/api/tweets', thread);
}

// Example 6: Complex thread with reply and quote
async function complexThread(replyToId, quoteId) {
  const thread = [
    {
      text: 'Starting a thread as a reply to another tweet',
      reply_to: replyToId
    },
    {
      text: 'Here\'s an interesting tweet I want to highlight:',
      quote: quoteId
    },
    {
      text: 'And here\'s my conclusion with an image',
      media: [
        {
          data: getImageData(), // Your function to get image data
          mimeType: 'image/jpeg'
        }
      ]
    }
  ];
  
  return await callTwitterAPI('/api/tweets', thread);
}

// Helper function to simulate getting image data
// In a real application, this would come from a file input or canvas
function getImageData() {
  // This is just a placeholder - in a real app you would use:
  // - A base64 encoded string from a canvas or file reader
  // - A Blob object from a file input
  return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/...';
}

// Usage examples
async function runExamples() {
  try {
    // Example 1: Simple tweet
    const simpleTweetResult = await postSimpleTweet();
    console.log('Simple tweet posted:', simpleTweetResult);
    
    // Use the tweet ID from the first tweet for the next examples
    const tweetId = simpleTweetResult.data.id;
    
    // Example 2: Reply to the tweet
    const replyResult = await replyToTweet(tweetId);
    console.log('Reply posted:', replyResult);
    
    // Example 3: Quote the original tweet
    const quoteResult = await quoteTweet(tweetId);
    console.log('Quote tweet posted:', quoteResult);
    
    // Example 4: Post a thread
    const threadResult = await postThread();
    console.log('Thread posted:', threadResult);
    
    // Example 5: Post a complex thread
    const complexResult = await complexThread(tweetId, tweetId);
    console.log('Complex thread posted:', complexResult);
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run the examples
// runExamples();
