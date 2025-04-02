# @crosspost/sdk

SDK for interacting with the Crosspost API.

## Overview

This SDK provides a simple way to interact with the Crosspost API, allowing you to:

- Authenticate with social media platforms
- Create, read, update, and delete posts
- Upload and manage media
- Monitor rate limits
- Handle errors gracefully

## Installation

```bash
npm install @crosspost/sdk
# or
yarn add @crosspost/sdk
# or
pnpm add @crosspost/sdk
# or
bun add @crosspost/sdk
```

## Usage

### Basic Setup

```typescript
import { CrosspostClient } from '@crosspost/sdk';
import { NearSigner } from '@crosspost/near-simple-signing';

// Initialize the NEAR signer
const signer = new NearSigner({
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://wallet.testnet.near.org'
});

// Connect to NEAR wallet and get account
await signer.connect();
const account = await signer.getAccount();

// Initialize the SDK with the NEAR signer
const client = new CrosspostClient({
  baseUrl: 'https://api.crosspost.example',
  auth: {
    type: 'near',
    signer: signer
  }
});
```

### Creating a Post

```typescript
import { PlatformName } from '@crosspost/types';

// Create a post on Twitter
const response = await client.twitter.createPost({
  content: {
    text: 'Hello from Crosspost SDK!'
  }
});

console.log(`Post created with ID: ${response.data.id}`);

// Create a post with media
const mediaResponse = await client.twitter.uploadMedia({
  media: {
    data: imageBlob, // File or Blob
    mimeType: 'image/jpeg',
    altText: 'A beautiful sunset'
  }
});

const postWithMediaResponse = await client.twitter.createPost({
  content: {
    text: 'Check out this sunset!',
    media: [{ id: mediaResponse.data.mediaId }]
  }
});
```

### Creating a Thread

```typescript
const threadResponse = await client.twitter.createPost({
  content: [
    {
      text: 'This is the first post in a thread!'
    },
    {
      text: 'This is the second post in the thread.'
    },
    {
      text: 'And this is the final post in the thread.'
    }
  ]
});

console.log(`Thread created with ${threadResponse.data.length} posts`);
```

### Interacting with Posts

```typescript
// Like a post
await client.twitter.likePost({
  postId: '1234567890'
});

// Repost/Retweet
await client.twitter.repost({
  postId: '1234567890'
});

// Quote post
await client.twitter.quotePost({
  postId: '1234567890',
  content: {
    text: 'Check out this post!'
  }
});

// Reply to a post
await client.twitter.replyToPost({
  postId: '1234567890',
  content: {
    text: 'Great post!'
  }
});

// Delete a post
await client.twitter.deletePost({
  postId: '1234567890'
});
```

### Error Handling

```typescript
try {
  const response = await client.twitter.createPost({
    content: {
      text: 'Hello from Crosspost SDK!'
    }
  });
  
  console.log(`Post created with ID: ${response.data.id}`);
} catch (error) {
  if (error.code === 'RATE_LIMITED') {
    console.error('Rate limit exceeded. Try again later.');
  } else if (error.code === 'UNAUTHORIZED') {
    console.error('Authentication failed. Please reconnect your account.');
  } else {
    console.error('An error occurred:', error.message);
  }
}
```

## API Reference

### `CrosspostClient`

The main client for interacting with the Crosspost API.

#### Constructor Options

```typescript
interface CrosspostClientOptions {
  baseUrl: string;
  auth: {
    type: 'near';
    signer: NearSigner;
  } | {
    type: 'apiKey';
    key: string;
  };
  defaultPlatform?: PlatformName;
  timeout?: number;
  retries?: number;
}
```

#### Platform Clients

- `twitter` - Twitter-specific client
- `mastodon` - Mastodon-specific client (coming soon)
- `linkedin` - LinkedIn-specific client (coming soon)
- `facebook` - Facebook-specific client (coming soon)

Each platform client provides methods for interacting with the platform's API:

- `createPost(request)` - Create a post
- `repost(request)` - Repost/retweet a post
- `quotePost(request)` - Quote a post
- `replyToPost(request)` - Reply to a post
- `likePost(request)` - Like a post
- `unlikePost(request)` - Unlike a post
- `deletePost(request)` - Delete a post
- `uploadMedia(request)` - Upload media
- `getMediaStatus(request)` - Get media status
- `updateMediaMetadata(request)` - Update media metadata

## License

MIT
