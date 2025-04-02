# @crosspost/near-simple-signing

NEAR wallet signature generation utility for Crosspost API authentication.

## Overview

This package provides a simple way to generate NEAR wallet signatures for authentication with the Crosspost API. It handles the complexities of:

- Connecting to NEAR wallets
- Generating properly formatted signatures
- Creating authentication headers
- Validating signatures

## Installation

```bash
npm install @crosspost/near-simple-signing
# or
yarn add @crosspost/near-simple-signing
# or
pnpm add @crosspost/near-simple-signing
# or
bun add @crosspost/near-simple-signing
```

## Usage

### Browser Environment

```typescript
import { NearSigner } from '@crosspost/near-simple-signing';

// Initialize the signer
const signer = new NearSigner({
  networkId: 'testnet', // or 'mainnet'
  nodeUrl: 'https://rpc.testnet.near.org',
  walletUrl: 'https://wallet.testnet.near.org'
});

// Connect to NEAR wallet
await signer.connect();

// Get the connected account
const account = await signer.getAccount();
console.log('Connected account:', account);

// Generate a signature for authentication
const signature = await signer.sign('Hello, world!');
console.log('Signature:', signature);

// Create an authentication header for the Crosspost API
const authHeader = signer.createAuthHeader('Hello, world!');
console.log('Auth header:', authHeader);

// Use the auth header in your API requests
fetch('https://api.crosspost.example/endpoint', {
  headers: {
    'Authorization': `Bearer ${authHeader}`
  }
});
```

### Node.js Environment

```typescript
import { NearSigner } from '@crosspost/near-simple-signing';
import { KeyPair } from 'near-api-js';

// Initialize the signer with a private key
const signer = new NearSigner({
  networkId: 'testnet',
  nodeUrl: 'https://rpc.testnet.near.org',
  accountId: 'your-account.testnet',
  keyPair: KeyPair.fromString('ed25519:your-private-key')
});

// Generate a signature
const signature = await signer.sign('Hello, world!');

// Create an authentication header
const authHeader = signer.createAuthHeader('Hello, world!');

// Use the auth header in your API requests
// ...
```

## API Reference

### `NearSigner`

The main class for generating NEAR signatures.

#### Constructor Options

```typescript
interface NearSignerOptions {
  // Network configuration
  networkId: 'mainnet' | 'testnet';
  nodeUrl: string;
  walletUrl?: string;
  
  // For Node.js environment
  accountId?: string;
  keyPair?: KeyPair;
  
  // Additional options
  relayerUrl?: string;
  headers?: Record<string, string>;
}
```

#### Methods

- `connect()`: Connect to NEAR wallet (browser only)
- `getAccount()`: Get the connected account
- `sign(message: string)`: Sign a message
- `createAuthHeader(message: string)`: Create an authentication header
- `validateSignature(signature: string, message: string, publicKey: string)`: Validate a signature

## Signature Format

The signature format follows the Crosspost API requirements:

```typescript
interface NearAuthData {
  account_id: string;
  public_key: string;
  signature: string;
  message: string;
  nonce: string;
  recipient?: string;
  callback_url?: string;
}
```

## License

MIT
