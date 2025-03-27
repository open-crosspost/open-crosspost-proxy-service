# Twitter Proxy API - Enhanced Tweet API

This directory contains examples and documentation for the Twitter Proxy API, with a focus on the enhanced tweet API capabilities.

## Enhanced Tweet API

The Twitter Proxy now provides a simplified API for all tweet operations. The existing endpoints have been enhanced to support:

- Post single tweets
- Create threaded tweets
- Include media uploads directly in the tweet request
- Reply to tweets
- Quote tweets
- Mix and match these features in flexible ways


## Request Format

The API accepts either a single tweet object or an array of tweet objects for threads:

### Single Tweet

```json
{
  "text": "This is a tweet",
  "media": [
    {
      "data": "base64-encoded-data-or-blob",
      "mimeType": "image/jpeg",
      "alt_text": "Description of the image"
    }
  ],
  "reply_to": "optional-tweet-id-to-reply-to",
  "quote": "optional-tweet-id-to-quote"
}
```

### Thread

```json
[
  {
    "text": "First tweet in the thread"
  },
  {
    "text": "Second tweet with media",
    "media": [
      {
        "data": "base64-encoded-data-or-blob",
        "mimeType": "image/jpeg"
      }
    ]
  },
  {
    "text": "Final tweet quoting another tweet",
    "quote": "tweet-id-to-quote"
  }
]
```

## Examples

### JavaScript Examples

See [updated-api-examples.js](./updated-api-examples.js) for complete JavaScript examples of using the enhanced API.

### TypeScript Test File

For a complete test suite demonstrating all features of the enhanced API, see [test-unified-api.ts](./test-unified-api.ts). This file includes examples of:

- Posting simple tweets
- Creating threads
- Replying to tweets
- Quoting tweets
- Including media
- Liking tweets
- Retrieving tweets

To run the test file:
1. Update the configuration with your API key and base URL
2. Run with: `bun run examples/test-unified-api.ts`

```javascript
// Post a simple tweet
const tweet = {
  text: 'This is a simple tweet!'
};

fetch('https://your-twitter-proxy.example.com/api/tweet', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key'
  },
  body: JSON.stringify(tweet)
})
.then(response => response.json())
.then(data => console.log('Tweet posted:', data));
```

### TypeScript SDK

For TypeScript users, we provide a convenient SDK that wraps the API. See [twitter-proxy-sdk.ts](./twitter-proxy-sdk.ts) for the full implementation.

```typescript
import { TwitterProxySDK } from './twitter-proxy-sdk';

const twitter = new TwitterProxySDK({
  baseUrl: 'https://your-twitter-proxy.example.com',
  apiKey: 'your-api-key'
});

// Post a simple tweet
twitter.postText('Hello world!').then(response => {
  console.log('Tweet posted:', response);
});

// Post a thread
twitter.tweet([
  { text: 'This is the first tweet in a thread' },
  { text: 'This is the second tweet' },
  { text: 'And this is the final tweet' }
]).then(response => {
  console.log('Thread posted:', response);
});

// Reply to a tweet
twitter.reply('tweet-id', 'This is my reply!').then(response => {
  console.log('Reply posted:', response);
});

// Quote a tweet
twitter.quote('tweet-id', 'Check out this tweet:').then(response => {
  console.log('Quote posted:', response);
});
```

## Media Handling

The enhanced API handles media uploads automatically. You can include media directly in your tweet request:

```javascript
const tweet = {
  text: 'Check out this image!',
  media: [
    {
      data: imageData, // Base64 string or Blob
      mimeType: 'image/jpeg',
      alt_text: 'A beautiful landscape photo'
    }
  ]
};
```

The API will:
1. Upload the media to Twitter
2. Get the media ID
3. Attach the media to your tweet
4. Set the alt text if provided

This eliminates the need for separate media upload calls before posting a tweet.

## API Endpoints

All endpoints have been enhanced while maintaining backward compatibility:

- `/api/tweet` - Post a single tweet or thread
- `/api/retweet` - Retweet a tweet
- `/api/quote` - Quote a tweet (single or thread)
- `/api/reply` - Reply to a tweet (single or thread)
- `/api/like/:id` - Like a tweet
- `/api/unlike/:id` - Unlike a tweet
- `/api/tweet/:id` - Delete a tweet (DELETE method)

The enhanced endpoints maintain backward compatibility with existing code while providing new capabilities.

## Error Handling

The API returns standard error responses with appropriate HTTP status codes and error messages:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Tweet must contain text or media"
  }
}
```

## Rate Limiting

The API respects Twitter's rate limits and will return appropriate error responses when limits are reached.
