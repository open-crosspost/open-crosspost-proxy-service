<img width="572" alt="Screenshot 2025-04-27 at 6 21 27 PM" src="https://github.com/user-attachments/assets/1875d7c8-79f1-41ec-9cd7-fb00b8c43f65" />

Easily and securely connect your app to social media platforms using NEAR wallet authentication. No
more handling OAuth tokens!

## What It Does

- Acts as a secure bridge between your app and platforms that use OAuth 2.0 PKCE
- Handles OAuth authentication, token refreshes, and rate limits for you
- Uses your NEAR wallet signature to authorize actions, and platform keys safe on the server

## Quick Start

### Prerequisites

- [Deno](https://deno.land/) (latest version)
- [Bun](https://bun.sh/) (for package development and monorepo orchestration, lol ik)
- NEAR Wallet

### Setup & Run

```bash
# Create .env file with required variables
cp .env.example .env

# Install dependencies
bun install

# Start the development server (API, SDK, and Types in watch mode)
bun run dev

# Or start just the API
deno task dev

# Run tests
bun run test
```

## Integration

This project provides two packages to help you integrate with the Crosspost API:

### @crosspost/types

TypeScript type definitions for the API, including request/response types, common types, and helper
functions. See the [Types Documentation](./packages/types/README.md) for details.

```typescript
import { CreatePostRequest, PlatformName } from '@crosspost/types';

const request: CreatePostRequest = {
  targets: [{ platform: 'twitter', userId: 'your-twitter-id' }],
  content: [{ text: 'Hello, world!' }],
};
```

### @crosspost/sdk

A client SDK that simplifies interaction with the API, handling authentication, requests, and error
management. See the [SDK Documentation](./packages/sdk/README.md) for detailed usage instructions.

```typescript
import * as near from "fastintear";
import { sign } from "near-sign-verify";
import { CrosspostClient } from '@crosspost/sdk';
import type { CreatePostRequest } from "@crosspost/sdk";

const client = new CrosspostClient();
const authToken = await sign({ signer: near, recipient: "crosspost.near", message: "createPost" });

client.setAuthentication(authToken);
client.setAccountHeader(near.accountId());

const connectedAccounts: ApiResponse<ConnectedAccountsResponse> = await client.auth.getConnectedAccounts():

try {
  const response = await await client.post.createPost({
    targets: [
      {
        userId: connectedAccounts[0].userId,
        platform: connectedAccounts[0].platform
      }
    ],
    content: [{
      text: "hello world",
      media: {
        data: imageBlob,
        mimeType: 'image/jpeg',
        altText: 'a beautiful sunset',
      }
    }]
  } as CreatePostRequest);

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

## Architecture

The service uses a layered architecture with clear separation of concerns, to standardize
authentication and social interactions and isolate platform-specific implementations:

```mermaid
flowchart TD
    Client[Client Applications] --> API[API Layer]
    API --> Controllers[Controllers]
    Controllers --> Services[Domain Services]
    Services --> PlatformAbstraction[Platform Abstraction]
    
    PlatformAbstraction --> Auth[PlatformAuth]
    PlatformAbstraction --> Client[PlatformClient]
    PlatformAbstraction --> Post[PlatformPost]
    PlatformAbstraction --> Media[PlatformMedia]
    PlatformAbstraction --> Profile[PlatformProfile]
    
    Auth --> TwitterAuth[Twitter Auth]
    Client --> TwitterClient[Twitter Client]
    Post --> TwitterPost[Twitter Post]
    Media --> TwitterMedia[Twitter Media]
    Profile --> TwitterProfile[Twitter Profile]
    
    Services --> Security[Security Services]
    Security --> NearAuth[NEAR Auth Service]
    Security --> TokenStorage[Token Storage]
    
    Services --> Storage[Storage Services]
    Storage --> KVStore[KV Store Utilities]
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant ClientApp as Client Application
    participant NearWallet as NEAR Wallet
    participant ProxyService as Crosspost Proxy
    participant TokenStorage as Token Storage
    participant NearAuthSvc as NEAR Auth Service
    participant PlatformAPI as Social Media Platform

    %% Step 1: NEAR Authorization %%
    ClientApp->>NearWallet: Request signature
    NearWallet-->>ClientApp: Return signed message
    ClientApp->>ProxyService: POST /auth/authorize/near (with NEAR Sig)
    ProxyService->>NearAuthSvc: Authorize NEAR account
    NearAuthSvc-->>ProxyService: Success
    ProxyService-->>ClientApp: 200 OK

    %% Step 2: Platform Account Linking %%
    ClientApp->>ProxyService: POST /auth/{platform}/login (with NEAR Sig)
    ProxyService->>ProxyService: Validate NEAR Signature
    ProxyService->>NearAuthSvc: Check authorization status
    NearAuthSvc-->>ProxyService: Authorized
    ProxyService->>ProxyService: Generate auth URL & state
    ProxyService->>NearAuthSvc: Store auth state with NEAR account
    ProxyService-->>ClientApp: Return auth URL

    %% Step 3: Platform OAuth %%
    ClientApp->>PlatformAPI: Redirect to auth URL
    PlatformAPI-->>ClientApp: User authorizes app
    PlatformAPI->>ProxyService: Callback with code & state
    ProxyService->>NearAuthSvc: Retrieve auth state
    ProxyService->>PlatformAPI: Exchange code for tokens
    PlatformAPI-->>ProxyService: Return tokens
    ProxyService->>TokenStorage: Securely store tokens
    ProxyService->>NearAuthSvc: Link platform account to NEAR account
    ProxyService-->>ClientApp: Redirect to success URL

    %% Step 4: Making API Calls %%
    ClientApp->>NearWallet: Request signature for API call
    NearWallet-->>ClientApp: Return signed message
    ClientApp->>ProxyService: API Request with NEAR Signature
    ProxyService->>ProxyService: Validate signature
    ProxyService->>NearAuthSvc: Get platform account for NEAR account
    ProxyService->>TokenStorage: Retrieve platform tokens
    ProxyService->>PlatformAPI: Make API call with tokens
    PlatformAPI-->>ProxyService: Return response
    ProxyService-->>ClientApp: Return formatted response
```
