# @crosspost/sdk

SDK for interacting with the Crosspost API.

## Overview

This package provides a client for interacting with the Crosspost API, allowing you to easily
integrate social media posting capabilities into your applications. The SDK is designed to be
flexible and easy to use, with support for multiple authentication methods and platforms.

## Features

- Unified client for all supported platforms
- Flexible authentication:
  - Direct `nearAuthData` injection
  - Automatic cookie-based authentication (`__crosspost_auth`)
  - Explicit authentication via `setAuthentication` method
- Platform-specific clients (Twitter, with more to come)
- Type-safe request/response handling using `@crosspost/types`
- Comprehensive error handling with specific `ApiError` and `PlatformError` types
- CSRF protection via Double Submit Cookie pattern

## Installation

```bash
bun install @crosspost/sdk
```

## Usage

### Initializing the SDK

The SDK can be initialized in several ways depending on how you manage authentication:

**1. Cookie-Based Authentication (Recommended for Browsers)**

If the user has previously authenticated via the API, the SDK can automatically use the
authentication data stored in the `__crosspost_auth` cookie.

```typescript
import { CrosspostClient } from '@crosspost/sdk';

// Client will automatically try to load auth from the cookie
const client = new CrosspostClient({
  baseUrl: 'https://your-crosspost-api.com', // Optional: Defaults to official API
});

// If the cookie exists and is valid, requests will be authenticated.
// If not, authenticated requests will throw an ApiError.
```

The cookie is stored with secure attributes:

- `secure: true` - Only sent over HTTPS
- `sameSite: 'lax'` - Provides CSRF protection while allowing top-level navigation
- `path: '/'` - Available across the entire domain
- `expires: 30 days` - Persists for 30 days

**2. Direct Authentication**

Provide the `nearAuthData` object directly if you have obtained it through other means (e.g.,
server-side flow, manual signing).

```typescript
import { CrosspostClient } from '@crosspost/sdk';
import type { NearAuthData } from 'near-sign-verify'; // Assuming this type exists

const nearAuthData: NearAuthData = {
  account_id: 'example.near',
  public_key: 'ed25519:...',
  signature: '...',
  message: '...',
  nonce: '...',
  recipient: 'crosspost-api.near',
  // callback_url and state are optional
};

const client = new CrosspostClient({
  baseUrl: 'https://your-crosspost-api.com',
  nearAuthData: nearAuthData,
});
```

**3. Explicit Authentication**

Initialize the client without authentication and set it later, for example, after a user logs in via
a NEAR wallet connection. This method also stores the authentication data in the `__crosspost_auth`
cookie for future use.

```typescript
import { CrosspostClient } from '@crosspost/sdk';
import type { NearAuthData } from 'near-sign-verify';

const client = new CrosspostClient({
  baseUrl: 'https://your-crosspost-api.com',
});

// Later, after obtaining the signature...
async function handleAuthentication(nearAuthData: NearAuthData) {
  try {
    // This sets the auth data in the client and stores it in the cookie
    await client.setAuthentication(nearAuthData);
    console.log('Authentication successful and stored.');
    // Client is now ready for authenticated requests
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}
```

### Making Authenticated Requests (Example: Twitter Client)

```typescript
// Create a post
const createPostResponse = await client.twitter.createPost({
  content: {
    text: 'Hello from Crosspost SDK!',
  },
});

console.log(`Post created with ID: ${createPostResponse.id}`);

// Create a post with media
const createPostWithMediaResponse = await client.twitter.createPost({
  content: {
    text: 'Check out this image!',
    media: [
      {
        type: 'image',
        url: 'https://example.com/image.jpg',
      },
    ],
  },
});

// Like a post
await client.twitter.likePost({
  postId: '1234567890',
});

// Repost a post
await client.twitter.repost({
  postId: '1234567890',
});

// Reply to a post
await client.twitter.reply({
  postId: '1234567890',
  content: {
    text: 'This is a reply!',
  },
});

// Delete a post
await client.twitter.deletePost({
  postId: '1234567890',
});
```

### Error Handling

```typescript
import { ApiError, ApiErrorCode, CrosspostClient, PlatformError } from '@crosspost/sdk';

try {
  // Ensure client is authenticated (either via cookie or direct data)
  const response = await client.post.createPost({ // Assuming a generic post API exists
    targets: [{ platform: 'twitter', userId: 'twitter_user_id' }], // Example target
    content: {
      text: 'Hello from Crosspost SDK!',
    },
  });

  console.log(`Post created with ID: ${response.id}`);
} catch (error) {
  if (error instanceof ApiError) {
    // Handle authentication errors
    if (error.code === ApiErrorCode.UNAUTHORIZED) {
      console.error('Authentication required. Please sign in with your NEAR wallet.');
      // Redirect to authentication flow or show login UI
    } else {
      console.error(`API Error: ${error.message}`);
      console.error(`Error Code: ${error.code}`); // e.g., RATE_LIMITED
      console.error(`Status: ${error.status}`); // HTTP status code
      console.error(`Details:`, error.details); // Additional context
      console.error(`Recoverable: ${error.recoverable}`);
    }
  } else if (error instanceof PlatformError) {
    // Handle errors specific to a platform (e.g., Twitter API error)
    console.error(`Platform Error (${error.platform}): ${error.message}`);
    console.error(`Original Error:`, error.originalError);
  } else {
    console.error(`Unexpected error:`, error);
  }
}
```

## API Reference

### `CrosspostClient`

The main client for interacting with the Crosspost API.

#### Constructor

```typescript
constructor(config?: CrosspostClientConfig)
```

`CrosspostClientConfig` Options:

- `baseUrl?: string`: Base URL of the Crosspost API. Defaults to the official endpoint.
- `nearAuthData?: NearAuthData`: NEAR authentication data object. If not provided, the client
  attempts to load from the `__crosspost_auth` cookie.
- `timeout?: number`: Request timeout in milliseconds (default: 30000).
- `retries?: number`: Number of retries for failed requests (network/5xx errors) (default: 2).

#### Methods

- `setAuthentication(nearAuthData: NearAuthData): Promise<void>`: Sets the provided `NearAuthData`
  in the client and stores it in the `__crosspost_auth` cookie for future use.

#### Properties

- `auth`: Instance of `AuthApi` for authentication-related operations.
- `post`: Instance of `PostApi` for post-related operations.

### API Modules

#### `AuthApi` (`client.auth`)

- `authorizeNearAccount(): Promise<NearAuthorizationResponse>`: Authorizes the current NEAR account
  (requires `nearAuthData` to be set).
- `getNearAuthorizationStatus(): Promise<NearAuthorizationResponse>`: Checks if the current NEAR
  account is authorized.
- `loginToPlatform(platform, options?): Promise<EnhancedApiResponse<any>>`: Initiates the OAuth
  login flow for a platform.
- `refreshToken(platform): Promise<EnhancedApiResponse<any>>`: Refreshes the platform token.
- `refreshProfile(platform): Promise<EnhancedApiResponse<any>>`: Refreshes the user's profile from
  the platform.
- `getAuthStatus(platform): Promise<AuthStatusResponse>`: Gets the authentication status for a
  specific platform.
- `revokeAuth(platform): Promise<AuthRevokeResponse>`: Revokes access for a specific platform.
- `getConnectedAccounts(): Promise<ConnectedAccountsResponse>`: Lists all platform accounts
  connected to the NEAR account.

#### `PostApi` (`client.post`)

- `createPost(request: CreatePostRequest): Promise<CreatePostResponse>`: Creates a new post.
- `repost(request: RepostRequest): Promise<RepostResponse>`: Reposts an existing post.
- `quotePost(request: QuotePostRequest): Promise<QuotePostResponse>`: Quotes an existing post.
- `replyToPost(request: ReplyToPostRequest): Promise<ReplyToPostResponse>`: Replies to an existing
  post.
- `likePost(request: LikePostRequest): Promise<LikePostResponse>`: Likes a post.
- `unlikePost(request: UnlikePostRequest): Promise<UnlikePostResponse>`: Unlikes a post.
- `deletePost(request: DeletePostRequest): Promise<DeletePostResponse>`: Deletes one or more posts.

### CSRF Protection

The SDK supports the Double Submit Cookie pattern for CSRF protection:

1. The backend API sets a CSRF token in a non-HttpOnly cookie named `XSRF-TOKEN`
2. The SDK automatically reads this token and includes it in the `X-CSRF-Token` header for all
   state-changing requests (non-GET)
3. The backend API validates that the token in the header matches the token in the cookie

This protection is automatically enabled when the backend API is configured to use CSRF tokens.

_(Note: Specific platform clients like `client.twitter` might be deprecated in favor of using the
generic `client.post` API with platform targets specified in the request body.)_

## License

MIT
