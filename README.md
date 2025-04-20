# Open Crosspost Proxy Service

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
import { CrosspostClient } from '@crosspost/sdk';

const client = new CrosspostClient({
  nearAuthData: {
    accountId: 'your-account.near',
    publicKey: 'ed25519:...',
    signature: '...',
    message: '...',
  },
});

// Create a post on Twitter
await client.post.createPost({
  targets: [{ platform: 'twitter', userId: 'your-twitter-id' }],
  content: [{ text: 'Hello from Crosspost!' }],
});
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
