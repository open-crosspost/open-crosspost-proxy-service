# @crosspost/sdk

SDK for interacting with the [Crosspost API](./../../README.md).

This package is designed to be used with
[near-sign-verify](https://github.com/elliotBraem/near-sign-verify) for authenticating requests via
a wallet or keypair.

## Installation

```bash
bun install @crosspost/sdk
```

## Usage

```typescript
import * as near from "fastintear"; // or near-api-js for creating key pairs
import { sign } from "near-sign-verify";
import {
  CrosspostClient,
  // error handling helpers
  CrosspostError,
  isAuthError,
  isPlatformError,
  isRateLimitError,
  isValidationError
} from '@crosspost/sdk';
import type {
  ConnectedAccount,
  Target,
  PostContent
} from "@crosspost/sdk";

// Initialize the client
const client = new CrosspostClient({
  baseUrl: 'https://your-self-hosted-crosspost-api.com', // Optional: Defaults to official API
});

const authToken = await sign({ signer: near, recipient: "crosspost.near", message: "do something..." });

client.setAuthentication(authToken);
client.setAccountHeader("signer.near")

const connectedAccounts: ApiResponse<ConnectedAccountsResponse> = await client.auth.getConnectedAccounts():

try {
  cosnt response = await await client.post.createPost({
    targets: [
      {
        userId: connectedAccounts[0].userId,
        platform: connectedAccounts[0].platform
      }
    ] as Target[],
    content: [{
      text: "hello world",
      media: {
        data: imageBlob,
        mimeType: 'image/jpeg',
        altText: 'a beautiful sunset',
      }
    } as PostContent[]]
  });

  console.log('Post created successfully');
  console.log('Post ID:', response.id);
  console.log('Platform:', response.platform);
  console.log('URL:', response.url);
  console.log('Created at:', response.createdAt);

} catch (error) {
  // Check if it's an authentication error
  if (isAuthError(error)) {
    console.error('Authentication required. Attempting to authorize...');
    // The account must be authorized with the backend
    const authorized = await client.auth.authorizeNearAccount();
    if (authorized) {
      // Retry the operation
      return createPost();
    }
  } else {
    // Handle other error types
    console.error('Error creating post:', error);
    if (error instanceof CrosspostError) {
      // Use error utility functions to handle specific cases
      if (isPlatformError(error)) {
        console.error('Platform:', error.platform);
        console.error('Error code:', error.code);
        console.error('Details:', error.details);
      } else if (isRateLimitError(error)) {
        console.error('Rate limited until:', error.details?.rateLimit?.reset);
      } else if (isValidationError(error)) {
        console.error('Validation errors:', error.details?.validationErrors);
      }
      // Check if error is recoverable
      if (error.recoverable) {
        console.log('This error is recoverable - retry may succeed');
      }
    } else if (error instanceof Error) {
      // Handle non-API errors (network issues, etc)
      console.error('Unexpected error:', error.message);
    }
  } 
}
```

## Methods

- `client.setAuthentication(authToken: string): Promise<void>` - Sets authentication data, necessary
  for non-GET requests
- `client.isAuthenticated(): boolean` - Checks if client is authenticated
- `client.setAccountHeader(accountId: string): Promise<void>` - Sets X-Near-Account Header,
  necessary for GET requests
- `client.clear(): boolean` - Clears authentication and account header

### Auth API (client.auth)

- `client.auth.authorizeNearAccount(): Promise<ApiResponse<NearAuthorizationResponse>>` - Authorizes
  NEAR account
- `client.auth.unauthorizeNearAccount(): Promise<ApiResponse<NearAuthorizationResponse>>` -
  Unauthorizes NEAR account
- `client.auth.getNearAuthorizationStatus(): Promise<ApiResponse<NearAuthorizationResponse>>` -
  Checks authorization status for authenticated account
- `client.auth.loginToPlatform(platform, options?): Promise<AuthCallbackResponse | ApiResponse<AuthUrlResponse>>` -
  Opens popup to initiate OAuth flow with platform
- `client.auth.refreshToken(platform): Promise<ApiResponse<AuthCallbackResponse>>` - Refreshes
  platform token
- `client.auth.refreshProfile(platform): Promise<ApiResponse<ConnectedAccount>>` - Refreshes user
  profile
- `client.auth.getAuthStatus(platform): Promise<ApiResponse<AuthStatusResponse>>` - Gets
  authentication status
- `client.auth.revokeAuth(platform): Promise<ApiResponse<AuthRevokeResponse>>` - Revokes platform
  access
- `client.auth.getConnectedAccounts(): Promise<ApiResponse<ConnectedAccountsResponse>>` - Lists
  connected accounts

### Post API (client.post)

Each post operation accepts a request object that includes:

- `targets`: Array of `{ platform: string, userId: string }` specifying where to perform the action
- Additional parameters specific to each operation

Available methods:

- `client.post.createPost(request: CreatePostRequest): Promise<CreatePostResponse>` - Creates posts
  on specified platforms
- `client.post.repost(request: RepostRequest): Promise<RepostResponse>` - Reposts an existing post
- `client.post.quotePost(request: QuotePostRequest): Promise<QuotePostResponse>` - Quotes an
  existing post
- `client.post.replyToPost(request: ReplyToPostRequest): Promise<ReplyToPostResponse>` - Replies to
  a post
- `client.post.likePost(request: LikePostRequest): Promise<LikePostResponse>` - Likes a post
- `client.post.unlikePost(request: UnlikePostRequest): Promise<UnlikePostResponse>` - Unlikes a post
- `client.post.deletePost(request: DeletePostRequest): Promise<DeletePostResponse>` - Deletes posts

### Activity API (client.activity)

- `client.activity.getLeaderboard(options): Promise<LeaderboardResponse>` - Gets activity
  leaderboard
- `client.activity.getAccountActivity(signerId, options): Promise<AccountActivityResponse>` - Gets
  account activity
- `client.activity.getAccountPosts(signerId, options): Promise<AccountPostsResponse>` - Gets account
  posts

### System API (client.system)

- `client.system.getRateLimits(): Promise<RateLimitsResponse>` - Gets all rate limits
- `client.system.getEndpointRateLimit(endpoint): Promise<EndpointRateLimitResponse>` - Gets endpoint
  rate limit
- `client.system.getHealthStatus(): Promise<HealthStatusResponse>` - Gets API health status

## API Reference

### Pagination

The SDK supports offset-based pagination for endpoints that return large collections:

```typescript
// Get paginated results with specific limit and offset
const response = await client.activity.getLeaderboard({
  limit: 10, // Number of items per page
  offset: 20, // Skip the first 20 items
});

// Access pagination metadata
console.log(`Total items: ${response.meta.pagination?.total}`);
console.log(`Current page size: ${response.meta.pagination?.limit}`);
console.log(`Current offset: ${response.meta.pagination?.offset}`);
```

### Multi-Status Responses

Post operations always return multi-status responses:

```typescript
// Operation targeting multiple platforms
const response = await client.post.createPost({
  targets: [
    { platform: 'twitter', userId: 'user1' },
    { platform: 'facebook', userId: 'user2' },
  ],
  content: [{ text: 'hello world' }],
});

// Check multi-status summary
console.log(`Total operations: ${response.data.summary.total}`);
console.log(`Successful: ${response.data.summary.succeeded}`);
console.log(`Failed: ${response.data.summary.failed}`);

// Access successful results
response.data.results.forEach((result) => {
  console.log(`Success on ${result.platform}: ${result.details.id}`);
});

// Access errors (if any)
if (response.data.errors && response.data.errors.length > 0) {
  // Error structure is identical to error.details.errors when all operations fail
  response.data.errors.forEach((error) => {
    console.log(`Error on ${error.details.platform}: ${error.message}`);
    console.log(`Error code: ${error.code}`);
    console.log(`Recoverable: ${error.recoverable}`);
  });
}
```

If all operations fail, the SDK throws a `CrosspostError` with the same error structure in
`details.errors`:

```typescript
try {
  await client.post.createPost({...});
} catch (error) {
  if (error instanceof CrosspostError) {
    // Error structure is identical to response.data.errors in partial success case
    error.details.errors.forEach(err => {
      console.log(`Error on ${err.details.platform}: ${err.message}`);
      console.log(`Error code: ${err.code}`);
      console.log(`Recoverable: ${err.recoverable}`);
    });
  }
}
```

This consistent error structure allows you to use the same error handling logic regardless of
whether you're dealing with partial failures in a multi-status response or complete failure.

### Validation Error Handling

The SDK provides detailed validation error information:

```typescript
try {
  await client.post.createPost({
    // Invalid or missing required fields
  });
} catch (error) {
  if (isValidationError(error)) {
    console.error('Validation failed:');

    // Access validation error details
    if (error.details?.validationErrors) {
      Object.entries(error.details.validationErrors).forEach(([field, issues]) => {
        console.error(`Field '${field}': ${issues.join(', ')}`);
      });
    }
  }
}
```

### Error Handling Utilities

```typescript
import {
  getErrorDetails,
  getErrorMessage,
  isAuthError,
  isContentError,
  isMediaError,
  isNetworkError,
  isPlatformError,
  isPostError,
  isRateLimitError,
  isRecoverableError,
  isValidationError,
} from '@crosspost/sdk';

// Check error types
if (isAuthError(error)) {
  // Handle authentication errors
}

// Get user-friendly error message
const message = getErrorMessage(error, 'Default message');

// Get error details
const details = getErrorDetails(error);
```

## Usage Examples

### Creating a Post

```typescript
// Create a text post on Twitter
const textPostResponse = await client.post.createPost({
  targets: [{
    platform: 'twitter',
    userId: 'your-twitter-id',
  }],
  content: [{
    text: 'Hello from Crosspost SDK!',
  }],
});

// Create a post with media on multiple platforms
const mediaPostResponse = await client.post.createPost({
  targets: [
    { platform: 'twitter', userId: 'your-twitter-id' },
    { platform: 'facebook', userId: 'your-facebook-id' },
  ],
  content: [{
    text: 'Check out this image!',
    media: [{
      data: imageBlob,
      mimeType: 'image/jpeg',
      altText: 'A beautiful sunset',
    }],
  }],
});
```

### Post Interactions

```typescript
// Like a post on Twitter
await client.post.likePost({
  targets: [{
    platform: 'twitter',
    userId: 'your-twitter-id',
  }],
  platform: 'twitter',
  postId: '1234567890',
});

// Repost on multiple platforms
await client.post.repost({
  targets: [
    { platform: 'twitter', userId: 'your-twitter-id' },
    { platform: 'facebook', userId: 'your-facebook-id' },
  ],
  platform: 'twitter',
  postId: '1234567890',
});

// Reply to a post
await client.post.replyToPost({
  targets: [{
    platform: 'twitter',
    userId: 'your-twitter-id',
  }],
  platform: 'twitter',
  postId: '1234567890',
  content: [{
    text: 'This is a reply',
  }],
});

// Delete posts
await client.post.deletePost({
  targets: [{
    platform: 'twitter',
    userId: 'your-twitter-id',
  }],
  posts: [{
    platform: 'twitter',
    userId: 'your-twitter-id',
    postId: '1234567890',
  }],
});
```

### Getting Activity Data

```typescript
// Get leaderboard
const leaderboard = await client.activity.getLeaderboard({
  timeframe: 'week',
  limit: 10,
});

// Get account activity
const activity = await client.activity.getAccountActivity('user.near', {
  timeframe: 'month',
});

// Get account posts
const posts = await client.activity.getAccountPosts('user.near', {
  limit: 20,
  offset: 0,
});
```

### Checking Rate Limits

```typescript
// Get all rate limits
const rateLimits = await client.system.getRateLimits();

// Get rate limit for a specific endpoint
const postRateLimit = await client.system.getEndpointRateLimit('post');
```
