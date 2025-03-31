# Crosspost SDK

A TypeScript SDK for interacting with the Crosspost API, allowing applications to easily integrate with multiple social media platforms through a unified interface.

## Features

- 🔒 **Secure Authentication**: Uses NEAR wallet signatures for authentication
- 🌐 **Platform Agnostic**: Supports multiple social media platforms through a unified API
- 📝 **Post Management**: Create, delete, like, and reply to posts
- 🖼️ **Media Support**: Upload images and videos with proper handling
- 📊 **Rate Limit Tracking**: Monitor and manage API rate limits
- 📱 **Cross-Environment**: Works in Node.js and browser environments
- 🔄 **Type Safety**: Full TypeScript support with comprehensive type definitions

## Installation

### NPM (Node.js and Browser)

```bash
npm install @crosspost/sdk
```

### JSR (Deno)

```bash
deno add @crosspost/sdk
```

## Quick Start

```typescript
import { CrosspostApiClient, SupportedPlatform } from '@crosspost/sdk';

// Initialize the client
const client = new CrosspostApiClient();

// Connect a platform account
await client.connectPlatformAccount(
  SupportedPlatform.TWITTER,
  'https://your-app.com/callback'
);

// Create a post
await client.createPost({
  targets: [
    {
      platform: SupportedPlatform.TWITTER,
      userId: 'your-twitter-user-id'
    }
  ],
  content: [
    {
      text: 'Hello world from Crosspost SDK!',
      media: [
        {
          data: 'base64-encoded-image-or-url',
          mimeType: 'image/jpeg',
          altText: 'A beautiful landscape'
        }
      ]
    }
  ]
});
```

## Authentication

The SDK uses NEAR wallet signatures for authentication. You need to provide the authentication data when initializing the client or making requests.

```typescript
// Initialize with auth data
const authData = getCurrentAuthData(); // Your function to get NEAR auth data
const client = new CrosspostApiClient({
  baseUrl: 'https://api.crosspost.example',
  authData
});

// Or set auth data later
client.setAuthData(authData);
```

### Popup Authentication

The SDK supports a popup-based authentication flow that doesn't navigate away from your application:

```typescript
// Connect a platform account using a popup window
await client.connectPlatformAccount(
  SupportedPlatform.TWITTER,
  'https://your-app.com/callback',
  {
    usePopup: true, // Use a popup window instead of redirecting
    popupFeatures: 'width=600,height=700,left=0,top=0', // Customize popup size
    onComplete: (result) => {
      if (result.success) {
        console.log('Authentication completed successfully!');
        // Fetch accounts or perform other actions
      } else {
        console.error('Authentication failed:', result.error);
      }
    }
  }
);
```

This approach:
- Keeps users on your application page
- Provides a better user experience
- Allows for custom handling of authentication completion
- Works across all modern browsers

## API Reference

### Client Initialization

```typescript
// Default initialization
const client = new CrosspostApiClient();

// Custom initialization
const client = new CrosspostApiClient({
  baseUrl: 'https://custom-api.example',
  authData: yourAuthData
});
```

### Account Management

```typescript
// Connect a platform account (with page redirect)
const authUrl = await client.connectPlatformAccount(
  SupportedPlatform.TWITTER,
  'https://your-app.com/callback',
  { usePopup: false } // Use traditional redirect (default is popup)
);

// Connect with popup (recommended)
await client.connectPlatformAccount(
  SupportedPlatform.TWITTER,
  'https://your-app.com/callback',
  {
    onComplete: (result) => {
      if (result.success) {
        // Handle successful authentication
      }
    }
  }
);

// Fetch connected accounts
const accounts = await client.fetchConnectedAccounts();

// Disconnect a platform account
await client.disconnectPlatformAccount(
  SupportedPlatform.TWITTER,
  'twitter-user-id'
);

// Refresh a platform account token
await client.refreshPlatformAccount(
  SupportedPlatform.TWITTER,
  'twitter-user-id'
);

// Check platform account status
const status = await client.checkPlatformAccountStatus(
  SupportedPlatform.TWITTER,
  'twitter-user-id'
);
```

### Post Management

```typescript
// Create a post
await client.createPost({
  targets: [
    {
      platform: SupportedPlatform.TWITTER,
      userId: 'twitter-user-id'
    }
  ],
  content: [
    {
      text: 'Hello world!',
      media: [
        {
          data: 'base64-encoded-image-or-url',
          mimeType: 'image/jpeg',
          altText: 'Description of the image'
        }
      ]
    }
  ]
});

// Create a thread
await client.createPost({
  targets: [
    {
      platform: SupportedPlatform.TWITTER,
      userId: 'twitter-user-id'
    }
  ],
  content: [
    { text: 'This is the first post in a thread' },
    { text: 'This is the second post in a thread' },
    { text: 'This is the third post in a thread' }
  ]
});
```

### Rate Limit Management

```typescript
// Get rate limit status
const rateLimits = await client.getRateLimitStatus();

// Get rate limit for a specific endpoint
const endpointLimit = await client.getRateLimitStatus('post');
```

## Error Handling

The SDK provides structured error responses:

```typescript
try {
  await client.createPost(/* ... */);
} catch (error) {
  if (error.success === false) {
    console.error('API Error:', error.error);
  } else {
    console.error('Network Error:', error);
  }
}
```

## Advanced Usage

### Custom Headers

```typescript
// Add custom headers to requests
client.setCustomHeaders({
  'X-Custom-Header': 'custom-value'
});
```

### Request Options

```typescript
// Set custom request options
client.setRequestOptions({
  timeout: 10000,
  retries: 3
});
```

## Development

### Building the SDK

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Run tests
npm test
```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
