/**
 * Examples of using the updated Twitter Proxy API
 * 
 * The existing endpoints now support:
 * - Threaded tweets
 * - Direct media uploads
 * - Simplified interface
 */

// Configuration
const API_BASE_URL = 'https://your-twitter-proxy.example.com';
const API_KEY = 'your-api-key';

// Helper function to make API requests
async function callTwitterAPI(endpoint, method, data) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: data ? JSON.stringify(data) : undefined
  });
  
  return await response.json();
}

// Example 1: Post a simple tweet
async function postSimpleTweet() {
  // You can now pass a simple string
  return await callTwitterAPI('/api/tweet', 'POST', 'This is a simple tweet!');
  
  // Or an object with text
  // return await callTwitterAPI('/api/tweet', 'POST', { text: 'This is a simple tweet!' });
}

// Example 2: Post a tweet with media
async function postTweetWithMedia() {
  // You can now include media directly in the tweet request
  const tweet = {
    text: 'Check out this image!',
    media: [
      {
        data: getImageData(), // Base64 string or Blob
        mimeType: 'image/jpeg',
        alt_text: 'A beautiful landscape photo'
      }
    ]
  };
  
  return await callTwitterAPI('/api/tweet', 'POST', tweet);
}

// Example 3: Post a thread
async function postThread() {
  // You can now post a thread by passing an array
  const thread = [
    'This is the first tweet in a thread!',
    'This is the second tweet.',
    {
      text: 'This is the third tweet with an image.',
      media: [
        {
          data: getImageData(), // Base64 string or Blob
          mimeType: 'image/jpeg',
          alt_text: 'A beautiful landscape photo'
        }
      ]
    },
    'This is the final tweet in the thread!'
  ];
  
  return await callTwitterAPI('/api/tweet', 'POST', thread);
}

// Example 4: Reply to a tweet
async function replyToTweet(tweetId) {
  // Simple reply
  const reply = {
    tweetId: tweetId,
    text: 'This is my reply!'
  };
  
  return await callTwitterAPI('/api/reply', 'POST', reply);
}

// Example 5: Reply with a thread
async function replyWithThread(tweetId) {
  // You can now reply with a thread
  const replyThread = [
    {
      tweetId: tweetId, // First tweet in thread replies to the original
      text: 'This is the first tweet in my reply thread!'
    },
    'This is the second tweet in the reply thread.',
    {
      text: 'This is the third tweet with an image.',
      media: [
        {
          data: getImageData(), // Base64 string or Blob
          mimeType: 'image/jpeg'
        }
      ]
    }
  ];
  
  return await callTwitterAPI('/api/reply', 'POST', replyThread);
}

// Example 6: Quote tweet
async function quoteTweet(tweetId) {
  // Simple quote
  const quote = {
    tweetId: tweetId,
    text: 'Check out this interesting tweet!'
  };
  
  return await callTwitterAPI('/api/quote', 'POST', quote);
}

// Example 7: Quote tweet with media
async function quoteWithMedia(tweetId) {
  // Quote with media
  const quoteWithMedia = {
    tweetId: tweetId,
    text: 'Check out this interesting tweet!',
    media: [
      {
        data: getImageData(), // Base64 string or Blob
        mimeType: 'image/jpeg'
      }
    ]
  };
  
  return await callTwitterAPI('/api/quote', 'POST', quoteWithMedia);
}

// Example 8: Quote tweet thread
async function quoteWithThread(tweetId) {
  // You can now create a thread of quote tweets
  const quoteThread = [
    {
      tweetId: tweetId,
      text: 'This is my first comment on this tweet!'
    },
    {
      tweetId: tweetId,
      text: 'And here\'s another perspective on the same tweet.'
    },
    {
      tweetId: tweetId,
      text: 'One final thought on this tweet.',
      media: [
        {
          data: getImageData(), // Base64 string or Blob
          mimeType: 'image/jpeg'
        }
      ]
    }
  ];
  
  return await callTwitterAPI('/api/quote', 'POST', quoteThread);
}

// Example 9: Retweet
async function retweet(tweetId) {
  return await callTwitterAPI('/api/retweet', 'POST', { tweetId });
}

// Example 10: Like a tweet
async function likeTweet(tweetId) {
  return await callTwitterAPI(`/api/like/${tweetId}`, 'POST', {});
}

// Example 11: Unlike a tweet
async function unlikeTweet(tweetId) {
  return await callTwitterAPI(`/api/like/${tweetId}`, 'DELETE');
}

// Example 12: Delete a tweet
async function deleteTweet(tweetId) {
  return await callTwitterAPI(`/api/tweet/${tweetId}`, 'DELETE');
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
    // Example 1: Post a simple tweet
    console.log('Posting a simple tweet...');
    const simpleTweetResult = await postSimpleTweet();
    console.log('Simple tweet posted:', simpleTweetResult);
    
    // Use the tweet ID from the first tweet for the next examples
    const tweetId = simpleTweetResult.data.id;
    
    // Example 2: Post a tweet with media
    console.log('Posting a tweet with media...');
    const mediaResult = await postTweetWithMedia();
    console.log('Tweet with media posted:', mediaResult);
    
    // Example 3: Post a thread
    console.log('Posting a thread...');
    const threadResult = await postThread();
    console.log('Thread posted:', threadResult);
    
    // Example 4: Reply to a tweet
    console.log('Replying to a tweet...');
    const replyResult = await replyToTweet(tweetId);
    console.log('Reply posted:', replyResult);
    
    // Example 5: Quote a tweet
    console.log('Quoting a tweet...');
    const quoteResult = await quoteTweet(tweetId);
    console.log('Quote posted:', quoteResult);
    
    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Uncomment to run the examples
// runExamples();
