# Open Crosspost Proxy Service

Easily and securely connect your app to social media platforms (like Twitter) using NEAR wallet
authentication. No more handling OAuth tokens on the client!

## What It Does

- Acts as a secure bridge between your app and platforms like Twitter
- Handles OAuth authentication, token refreshes, and rate limits for you
- Uses your NEAR wallet signature to authorize actions, keeping platform keys safe on the server
- Built with Deno and designed to run efficiently on the edge (Deno Deploy)

## Quick Start

### Prerequisites

- [Deno](https://deno.land/) (latest version)
- [Bun](https://bun.sh/) (for package development)
- NEAR Wallet
- Platform API keys

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

The SDK

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

### Three Simple Steps

1. **Authorize Your NEAR Account** (one-time setup)

   ```bash
   POST /auth/authorize/near
   ```

   Include your NEAR signature in the header.

2. **Connect a Platform Account** (for each platform)

   ```bash
   POST /auth/twitter/login
   ```

   Include your NEAR signature. This redirects through Twitter's OAuth flow.

3. **Make API Calls** (using your NEAR signature)

   ```bash
   POST /api/post
   ```

   Include the `Authorization` header in all requests.

## Core API Endpoints

### Authentication

```bash
POST /auth/authorize/near          # Authorize your NEAR account
POST /auth/{platform}/login        # Connect a platform account (e.g., twitter)
GET /auth/accounts                 # List accounts connected to your NEAR wallet
```

### Posting

```bash
POST /api/post                     # Create a post
```

Example request:

```json
{
  "platform": "twitter",
  "content": {
    "text": "Hello world from Crosspost Proxy!",
    "media": [
      {
        "type": "image",
        "body": "https://example.com/image.jpg"
      }
    ]
  }
}
```

All requests require the Authorization header with your NEAR signature.

## Project Structure

This project is organized as a monorepo with a Deno-first approach:

```
open-crosspost-proxy-service/
├── src/                # Deno API code
├── packages/           # Shared packages
│   ├── types/          # Shared type definitions
│   │   ├── src/        # TypeScript source
│   │   ├── mod.ts      # Deno entry point
│   │   └── deno.json   # JSR package config
│   └── sdk/            # Client SDK
│       ├── src/        # TypeScript source
│       ├── mod.ts      # Deno entry point
│       └── deno.json   # JSR package config
├── deno.json           # Deno config for API
└── package.json        # Root package.json for monorepo
```

### Development Workflow

- **Deno-first Development**: The API is built with Deno, and packages are designed to work with
  Deno first.
- **Dual Publishing**: Packages are published to both JSR (for Deno) and npm (for Node.js).
- **Native Deno Imports**: Source files are directly importable by Deno without any conversion.
- **Local Development**: During development, the API imports directly from local packages using
  import maps.
- **Production**: In production, the API imports packages from JSR.

### Commands

```bash
# Start all development (API, SDK, Types in watch mode)
bun run dev

# Build all packages for both Deno and Node.js
bun run build

# Run all tests
bun run test

# Lint all code
bun run lint
```

## SDK Packages

We provide three SDK packages to simplify integration:

### @crosspost/types

```typescript
import { PlatformName, PostCreateRequest } from '@crosspost/types';

const request: PostCreateRequest = {
  platform: 'twitter',
  content: {
    text: 'Hello, world!',
  },
};
```

### @crosspost/sdk

```typescript
import { CrosspostClient } from '@crosspost/sdk';

const client = new CrosspostClient({
  baseUrl: 'https://api.crosspost.example',
  auth: {
    type: 'near',
    signer: signer,
  },
});

const response = await client.twitter.createPost({
  content: {
    text: 'Hello from Crosspost SDK!',
  },
});
```

## Extending the Platform

The project uses a platform-agnostic design, making it easy to add support for additional social
media platforms:

1. Implement the platform interfaces in `src/infrastructure/platform/abstract/`
2. Add the platform-specific client to the SDK
3. Update the platform enum in the types package

## License

MIT
