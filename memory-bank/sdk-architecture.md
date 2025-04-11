# SDK Architecture

## Overview

The Crosspost API includes a comprehensive SDK architecture that consists of three separate
packages:

1. **@crosspost/types** - Shared type definitions
2. **@crosspost/near-simple-signing** - NEAR signature generation utility
3. **@crosspost/sdk** - Main API client SDK

This architecture provides a modular approach to interacting with the Crosspost API, allowing
developers to use only the components they need.

## Package: @crosspost/types

This package contains shared TypeScript type definitions used across the Crosspost API ecosystem.

### Directory Structure

```
@crosspost/types/
├── src/
│   ├── auth.ts            # Auth-related types and schemas
│   ├── post.ts            # Post-related types and schemas
│   ├── media.ts           # Media-related types and schemas
│   ├── leaderboard.ts     # Leaderboard-related types and schemas
│   ├── rate-limit.ts      # Rate limit-related types and schemas
│   ├── common.ts          # Common types and schemas
│   ├── response.ts        # Response types and schemas
│   ├── errors/            # Error types and schemas
│   └── index.ts           # Main entry point
├── package.json
├── tsconfig.json
└── README.md
```

### Key Features

- TypeScript interfaces for all request/response types
- Zod schemas for runtime validation
- Shared enums and constants
- Error type definitions
- No runtime dependencies, pure type definitions
- Compatible with both Node.js and browser environments

## Package: @crosspost/near-simple-signing

This package provides a simple way to generate NEAR wallet signatures for authentication with the
Crosspost API.

### Directory Structure

```
@crosspost/near-simple-signing/
├── src/
│   ├── core/
│   │   └── near-signer.ts  # Main NearSigner class
│   ├── utils/
│   │   └── index.ts        # Utility functions
│   ├── types.ts            # Type definitions
│   └── index.ts            # Main entry point
├── package.json
├── tsconfig.json
└── README.md
```

### Key Features

- Connect to NEAR wallets
- Generate properly formatted signatures
- Create authentication headers
- Validate signatures
- Support for both browser and Node.js environments

## Package: @crosspost/sdk

This package provides a client for interacting with the Crosspost API.

### Directory Structure

```
@crosspost/sdk/
├── src/
│   ├── auth/
│   │   ├── auth-provider.ts         # Auth provider interface
│   │   ├── near-auth-provider.ts    # NEAR auth provider
│   │   ├── api-key-auth-provider.ts # API key auth provider
│   │   └── index.ts                 # Auth exports
│   ├── core/
│   │   └── client.ts                # Main client
│   ├── errors/
│   │   └── index.ts                 # Error handling
│   ├── platforms/
│   │   ├── platform-client.ts       # Platform client interface
│   │   ├── twitter-client.ts        # Twitter client
│   │   └── index.ts                 # Platform exports
│   └── index.ts                     # Main entry point
├── package.json
├── tsconfig.json
└── README.md
```

### Key Features

- Unified client for all platforms
- Authentication with NEAR wallet signatures or API keys
- Platform-specific clients (Twitter, with more to come)
- Type-safe request/response handling
- Comprehensive error handling

## Usage Flow

The typical usage flow for the SDK is:

1. Initialize the NEAR signer with wallet connection details
2. Connect to the NEAR wallet
3. Initialize the Crosspost client with the NEAR signer
4. Use the platform-specific clients to interact with the API

```typescript
import { CrosspostClient } from '@crosspost/sdk';
import { NearSigner } from '@crosspost/near-simple-signing';

// Initialize the NEAR signer
const signer = new NearSigner({
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://wallet.testnet.near.org',
});

// Connect to NEAR wallet
await signer.connect();

// Initialize the SDK with the NEAR signer
const client = new CrosspostClient({
  baseUrl: 'https://api.crosspost.example',
  auth: {
    type: 'near',
    signer: signer,
  },
});

// Use the Twitter client to create a post
const response = await client.twitter.createPost({
  content: {
    text: 'Hello from Crosspost SDK!',
  },
});
```

## Benefits of This Architecture

1. **Modularity**: Each package has a clear, focused responsibility
2. **Reusability**: The NEAR signing package can be used in other projects
3. **Maintainability**: Easier to update and maintain each package independently
4. **Type Safety**: Shared types ensure consistency between backend and frontend
5. **Flexibility**: Users can choose which components they need
