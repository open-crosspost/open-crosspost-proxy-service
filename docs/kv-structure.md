# Deno KV Structure

This document outlines the key structure used in the Deno KV database for the Twitter API Proxy.

## Overview

The application uses Deno KV for storing various types of data, including OAuth tokens,
authentication state, NEAR account authorization status, and more. This document provides a
comprehensive guide to the key patterns used throughout the application.

## Key Patterns

### Token Storage

- **Key Pattern**: `['tokens', platform, userId]`
- **Value**: Encrypted token object (TwitterTokens, etc.)
- **Example**: `['tokens', 'twitter', '12345']`
- **Purpose**: Stores encrypted OAuth tokens for users
- **Location**: `src/infrastructure/storage/token-storage.ts`

```typescript
// Example token object
{
  accessToken: "...",
  refreshToken: "...",
  expiresAt: 1617293847000,
  scope: ["tweet.read", "tweet.write", "users.read", "offline.access", "like.write"],
  tokenType: "oauth2"
}
```

### Auth State

- **Key Pattern**: `['auth', state]`
- **Value**: AuthState object
- **Example**: `['auth', 'abc123']`
- **Purpose**: Temporarily stores OAuth state during authentication flow
- **Location**: `src/infrastructure/platform/twitter/twitter-auth.ts`
- **Expiration**: 1 hour (3600000 milliseconds)

```typescript
// Example auth state object
{
  redirectUri: "https://example.com/callback",
  codeVerifier: "...",
  state: "abc123",
  createdAt: 1617293847000,
  successUrl: "https://example.com/success",
  errorUrl: "https://example.com/error",
  signerId: "alice.near"
}
```

### NEAR Account Authorization

- **Key Pattern**: `['near_auth', signerId]`
- **Value**: `{ authorized: boolean, timestamp: string }`
- **Example**: `['near_auth', 'alice.near']`
- **Purpose**: Tracks whether a NEAR account is authorized to use the proxy
- **Location**: `src/infrastructure/security/near-auth/near-auth.service.ts`

```typescript
// Example NEAR auth object
{
  authorized: true,
  timestamp: "2023-04-01T12:00:00.000Z"
}
```

### NEAR Account Tokens

- **Key Pattern**: `['token', signerId, platform, userId]`
- **Value**: Token object
- **Example**: `['token', 'alice.near', 'twitter', '12345']`
- **Purpose**: Links NEAR accounts to platform accounts
- **Location**: `src/infrastructure/security/near-auth/near-auth.service.ts`

```typescript
// Example token reference object (actual tokens are stored in token storage)
{
  accessToken: "...",
  refreshToken: "...",
  expiresAt: 1617293847000,
  scope: ["tweet.read", "tweet.write", "users.read", "offline.access", "like.write"],
  tokenType: "oauth2"
}
```

### Connected Accounts Index

- **Key Pattern**: `['index', signerId]`
- **Value**: Array of `{ platform, userId }` objects
- **Example**: `['index', 'alice.near']`
- **Purpose**: Provides a quick lookup of all accounts connected to a NEAR wallet
- **Location**: `src/infrastructure/security/near-auth/near-auth.service.ts`

```typescript
// Example connected accounts index
[
  { platform: 'twitter', userId: '12345' },
  { platform: 'linkedin', userId: '67890' },
];
```

### User Profiles

- **Key Pattern**: `['profile', platform, userId]`
- **Value**: Platform-specific user profile object
- **Example**: `['profile', 'twitter', '12345']`
- **Purpose**: Stores user profile information from platforms
- **Location**: `src/infrastructure/storage/user-profile-storage.ts`

```typescript
// Example Twitter profile object
{
  id: "12345",
  name: "John Doe",
  username: "johndoe",
  profile_image_url: "https://example.com/profile.jpg",
  verified: true,
  created_at: "2023-01-01T00:00:00.000Z"
}
```

### Token Access Logs

- **Key Pattern**: `['token_access_logs', timestamp]`
- **Value**: TokenAccessLog object
- **Example**: `['token_access_logs', '1617293847000']`
- **Purpose**: Logs all token access operations for security auditing
- **Location**: `src/infrastructure/security/token-access-logger.ts`

```typescript
// Example token access log
{
  timestamp: 1617293847000,
  operation: "get",
  userId: "1234***5678", // Redacted for privacy
  success: true,
  platform: "twitter"
}
```

## Prefixed KV Store

The application uses a `PrefixedKvStore` utility class to simplify working with prefixed keys. This
class provides methods for getting, setting, deleting, and listing values with a common prefix.

```typescript
// Example usage
const authStore = new PrefixedKvStore(['auth', 'twitter']);
await authStore.set(['user123'], { name: 'John' });
// Actual key in KV: ['auth', 'twitter', 'user123']
```

## KV Management

The application includes a utility script for managing the Deno KV database during development:

```bash
# List all keys in the Deno KV database
deno task list-kv

# Clear all keys from the Deno KV database (with confirmation prompt)
deno task clear-kv

# Clear all keys without confirmation
deno task clear-kv -- --yes

# Only operate on keys with a specific prefix
deno task clear-kv -- --prefix=tokens
```

## Best Practices

1. **Use Consistent Key Patterns**: Always follow the established key patterns for each type of
   data.
2. **Include Platform in Keys**: Always include the platform name in keys to avoid conflicts between
   platforms.
3. **Use Encryption for Sensitive Data**: Always encrypt sensitive data like OAuth tokens before
   storing in KV.
4. **Set Expiration for Temporary Data**: Use expiration for temporary data like auth state to avoid
   KV clutter.
5. **Use Prefixed KV Store**: Use the `PrefixedKvStore` utility class for working with prefixed
   keys.
6. **Log Access to Sensitive Data**: Use the `TokenAccessLogger` to log access to sensitive data.
7. **Redact PII in Logs**: Always redact personally identifiable information (PII) in logs.
