# @crosspost/sdk

SDK for interacting with the Crosspost API.

## Installation

```bash
bun install @crosspost/sdk
```

## Quick Start

```typescript
import { CrosspostClient, CrosspostError, isAuthError } from '@crosspost/sdk';

// Initialize the client (authentication can be provided later)
const client = new CrosspostClient({
  baseUrl: 'https://your-crosspost-api.com', // Optional: Defaults to official API
});

// Set authentication with fresh signature for the request
client.setAuthentication({
  accountId: 'your-account.near',
  publicKey: 'ed25519:...',
  signature: '...',
  message: '...',
});

// Check if client has authentication data set
if (client.isAuthenticated()) {
  console.log('Client has authentication data');
}

// NEAR Account Authorization
async function authorizeNearAccount() {
  try {
    // Authorize with NEAR account
    const authResponse = await client.auth.authorizeNearAccount();
    console.log('NEAR authorization successful');
    console.log('Account ID:', authResponse.accountId);
    console.log('Status:', authResponse.status);
    console.log('Connected platforms:', authResponse.connectedPlatforms);
    return true;
  } catch (error) {
    console.error('NEAR authorization failed');
    if (error instanceof CrosspostError) {
      console.error('Error code:', error.code);
      console.error('Status:', error.status);
      console.error('Details:', error.details);
      console.error('Recoverable:', error.recoverable);
    }
    return false;
  }
}

// Unauthorize NEAR Account
async function unauthorizeNearAccount() {
  try {
    // Unauthorize NEAR account (removes all platform connections)
    const response = await client.auth.unauthorizeNearAccount();
    console.log('NEAR account unauthorized');
    console.log('Status:', response.status);
    console.log('Message:', response.message);
    return true;
  } catch (error) {
    console.error('Failed to unauthorize NEAR account');
    if (error instanceof CrosspostError) {
      console.error('Error code:', error.code);
      console.error('Status:', error.status);
      console.error('Details:', error.details);
    }
    return false;
  }
}

// Revoke Platform Authorization
async function revokePlatformAuth(platform) {
  try {
    // Revoke specific platform authorization
    const response = await client.auth.revokeAuth(platform);
    console.log(`${platform} authorization revoked`);
    console.log('Status:', response.status);
    console.log('Platform:', response.platform);
    console.log('Message:', response.message);
    return true;
  } catch (error) {
    console.error(`Failed to revoke ${platform} authorization`);
    if (error instanceof CrosspostError) {
      console.error('Error code:', error.code);
      console.error('Status:', error.status);
      console.error('Details:', error.details);
    }
    return false;
  }
}

// Example usage
async function createPost() {
  try {
    const response = await client.post.createPost({
      targets: [{ platform: 'twitter', userId: 'your-twitter-id' }],
      content: {
        text: 'Hello from Crosspost SDK!',
      },
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
      const authorized = await authorizeNearAccount();
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
}
```

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

Some operations that target multiple platforms may result in partial success. The SDK handles these
cases with multi-status responses:

```typescript
// Operation targeting multiple platforms
const response = await client.post.createPost({
  targets: [
    { platform: 'twitter', userId: 'user1' },
    { platform: 'facebook', userId: 'user2' },
  ],
  content: [{ text: 'Hello world!' }],
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
  if (error instanceof CrosspostError && error.details?.errors) {
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

### CrosspostClient

```typescript
constructor(config?: {
  baseUrl?: string;
  nearAuthData?: NearAuthData;
  timeout?: number;
  retries?: number;
})
```

#### Methods

- `setAuthentication(nearAuthData: NearAuthData): Promise<void>` - Sets authentication data
- `isAuthenticated(): boolean` - Checks if client is authenticated

### Auth API (client.auth)

- `authorizeNearAccount(): Promise<NearAuthorizationResponse>` - Authorizes NEAR account
- `unauthorizeNearAccount(): Promise<NearAuthorizationResponse>` - Unauthorizes NEAR account
- `getNearAuthorizationStatus(): Promise<NearAuthorizationResponse>` - Checks authorization status
- `loginToPlatform(platform, options?): Promise<EnhancedApiResponse<any>>` - Initiates OAuth flow
- `refreshToken(platform): Promise<EnhancedApiResponse<any>>` - Refreshes platform token
- `refreshProfile(platform): Promise<EnhancedApiResponse<any>>` - Refreshes user profile
- `getAuthStatus(platform): Promise<AuthStatusResponse>` - Gets authentication status
- `revokeAuth(platform): Promise<AuthRevokeResponse>` - Revokes platform access
- `getConnectedAccounts(): Promise<ConnectedAccountsResponse>` - Lists connected accounts

### Post API (client.post)

Each post operation accepts a request object that includes:

- `targets`: Array of `{ platform: string, userId: string }` specifying where to perform the action
- Additional parameters specific to each operation

Available methods:

- `createPost(request: CreatePostRequest): Promise<CreatePostResponse>` - Creates posts on specified
  platforms
- `repost(request: RepostRequest): Promise<RepostResponse>` - Reposts an existing post
- `quotePost(request: QuotePostRequest): Promise<QuotePostResponse>` - Quotes an existing post
- `replyToPost(request: ReplyToPostRequest): Promise<ReplyToPostResponse>` - Replies to a post
- `likePost(request: LikePostRequest): Promise<LikePostResponse>` - Likes a post
- `unlikePost(request: UnlikePostRequest): Promise<UnlikePostResponse>` - Unlikes a post
- `deletePost(request: DeletePostRequest): Promise<DeletePostResponse>` - Deletes posts

### Activity API (client.activity)

- `getLeaderboard(options): Promise<LeaderboardResponse>` - Gets activity leaderboard
- `getAccountActivity(signerId, options): Promise<AccountActivityResponse>` - Gets account activity
- `getAccountPosts(signerId, options): Promise<AccountPostsResponse>` - Gets account posts

### System API (client.system)

- `getRateLimits(): Promise<RateLimitsResponse>` - Gets all rate limits
- `getEndpointRateLimit(endpoint): Promise<EndpointRateLimitResponse>` - Gets endpoint rate limit
- `getHealthStatus(): Promise<HealthStatusResponse>` - Gets API health status

### Error Handling Utilities

```typescript
import {
  apiWrapper,
  enrichErrorWithContext,
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

// Add context to errors
const enrichedError = enrichErrorWithContext(error, {
  operation: 'createPost',
  timestamp: Date.now(),
});

// Wrap API calls with error handling
const result = await apiWrapper(
  async () => {
    // API call implementation
    return await fetch('/api/endpoint');
  },
  { operation: 'fetchData' }, // Optional context
);
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
    text: 'This is a reply!',
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

## Authentication and Security

### Authentication Strategy

The SDK uses direct authentication with per-request signatures:

```typescript
// Initialize the client
const client = new CrosspostClient({
  baseUrl: 'https://your-crosspost-api.com',
});

// Before making authenticated requests, set fresh signature
client.setAuthentication({
  accountId: 'your-account.near',
  publicKey: 'ed25519:...',
  signature: '...',
  message: '...',
});
```
