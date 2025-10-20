# @crosspost/plugin

Crosspost plugin for social media cross-posting with NEAR authentication. Provides secure social
media operations using NEAR wallet authentication instead of traditional OAuth tokens.

## Features

- 🔐 **NEAR Wallet Authentication** - Use your NEAR wallet to sign requests
- 🌐 **Multi-Platform Support** - Currently supports Twitter, designed to be extensible
- 📱 **Social Media Operations** - Create, delete, like, repost, quote, reply to posts
- 📊 **Activity Tracking** - Leaderboards, account activity, and post history
- ⚡ **Rate Limiting** - Built-in usage limits and platform rate limit handling
- 🛡️ **Secure** - Platform tokens stored safely on server, never exposed to client

## Installation

```bash
npm install @crosspost/plugin
```

## Quick Start

```typescript
import { createPluginRuntime } from 'every-plugin/runtime';

const runtime = createPluginRuntime({
  registry: {
    '@crosspost/plugin': {
      remoteUrl: 'https://cdn.crosspost.near/plugin/remoteEntry.js',
    },
  },
});

const { client } = await runtime.usePlugin('@crosspost/plugin', {
  variables: {
    baseUrl: 'https://api.opencrosspost.com',
    timeout: 10000,
  },
  secrets: {
    nearAuthData: JSON.stringify({
      account_id: 'your-account.near',
      public_key: 'ed25519:...',
      signature: '...',
      message: '...',
      nonce: [1, 2, 3],
      recipient: 'crosspost.near',
    }),
  },
});

// Authorize your NEAR account
await client.auth.authorizeNearAccount();

// Create a post
await client.post.create({
  targets: [{ platform: 'twitter', userId: 'your-twitter-id' }],
  content: [{ text: 'Hello from Crosspost!' }],
});
```

## API Reference

### Authentication

```typescript
// Authorize NEAR account
await client.auth.authorizeNearAccount();

// Check authorization status
await client.auth.getNearAuthorizationStatus();

// Login to platform (Twitter, etc.)
await client.auth.loginToPlatform('twitter', { redirect: false });

// Get connected accounts
const accounts = await client.auth.getConnectedAccounts();
```

### Posts

```typescript
// Create a post
await client.post.create({
  targets: [{ platform: 'twitter', userId: '123456' }],
  content: [{ text: 'Hello world!' }],
});

// Like a post
await client.post.like({
  targets: [{ platform: 'twitter', userId: '123456' }],
  platform: 'twitter',
  postId: 'post-123',
});

// Repost
await client.post.repost({
  targets: [{ platform: 'twitter', userId: '123456' }],
  platform: 'twitter',
  postId: 'post-123',
});

// Quote post
await client.post.quote({
  targets: [{ platform: 'twitter', userId: '123456' }],
  platform: 'twitter',
  postId: 'post-123',
  content: [{ text: 'Great post!' }],
});

// Reply to post
await client.post.reply({
  targets: [{ platform: 'twitter', userId: '123456' }],
  platform: 'twitter',
  postId: 'post-123',
  content: [{ text: 'Thanks for sharing!' }],
});

// Delete post
await client.post.delete({
  targets: [{ platform: 'twitter', userId: '123456' }],
  posts: [{ platform: 'twitter', userId: '123456', postId: 'post-123' }],
});
```

### Activity

```typescript
// Get leaderboard
const leaderboard = await client.activity.getLeaderboard({
  timeframe: 'week',
  limit: 10,
});

// Get account activity
const activity = await client.activity.getAccountActivity({
  signerId: 'user.near',
  query: { timeframe: 'month' },
});

// Get account posts
const posts = await client.activity.getAccountPosts({
  signerId: 'user.near',
  query: { limit: 20, offset: 0 },
});
```

### System

```typescript
// Get health status
const health = await client.system.getHealthStatus();

// Get rate limits
const rateLimits = await client.system.getRateLimits();

// Get endpoint rate limit
const postLimit = await client.system.getEndpointRateLimit('post');
```

## Configuration

### Variables

- `baseUrl` (string): API base URL (default: "https://api.opencrosspost.com")
- `timeout` (number): Request timeout in milliseconds (default: 10000)

### Secrets

- `nearAuthData` (string): JSON string containing NEAR authentication data

## Error Handling

The plugin uses the every-plugin error system with CommonPluginErrors:

```typescript
try {
  await client.post.create({...});
} catch (error) {
  if (error.code === 'AUTH_ERROR') {
    // Handle authentication errors
  } else if (error.code === 'RATE_LIMIT_ERROR') {
    // Handle rate limit errors
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run integration tests
npm run test:integration

# Build plugin
npm run build
```

## License

Part of the [every-plugin](https://github.com/near-everything/every-plugin) framework.
