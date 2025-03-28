# NEAR Twitter Integration Example

This example demonstrates how to integrate NEAR wallet authentication with Twitter OAuth to create a simple tweet posting application. It showcases the new authentication flow that replaces API keys with NEAR account signatures.

## Features

- Connect to NEAR wallet for authentication
- Connect to Twitter via OAuth
- Post tweets using NEAR signature for authentication
- Secure token storage with platform-specific keys

## How It Works

### NEAR Authentication

1. The user signs in with their NEAR wallet
2. When posting a tweet, the app requests the user to sign a message using their NEAR wallet
3. The signature, along with the message, nonce, and public key, is used for authentication
4. The backend validates the signature to authenticate the user

### Twitter Integration

1. The user connects their Twitter account via OAuth
2. The app stores the Twitter tokens securely
3. When posting a tweet, the app uses the stored Twitter tokens and NEAR authentication

## Running the Example

### Prerequisites

- A local development server (e.g., using `serve` or any static file server)
- The Twitter Proxy API running locally or deployed
- A NEAR wallet (testnet or mainnet)

### Setup

1. Start a local server to serve the example files:

```bash
# Using npm
cd examples/near-twitter-example
npm install
npm start

# Or using bun
cd examples/near-twitter-example
bun install
bun start
```

2. Open your browser and navigate to the local server (e.g., http://localhost:3000 or http://localhost:5000)

3. Follow the on-screen instructions to connect your NEAR wallet and Twitter account

### Usage

1. Sign in with your NEAR wallet by clicking the "Sign In with NEAR" button
2. Connect your Twitter account by clicking the "Connect Twitter" button
3. Enter your tweet text in the text area
4. Click "Post Tweet" to post the tweet using your NEAR signature for authentication

## Implementation Details

### NEAR Signature Validation

The backend validates NEAR signatures using the following process:

1. Extract authentication data from headers:
   - `X-Near-Account-Id`: The NEAR account ID
   - `X-Near-Public-Key`: The public key
   - `X-Near-Signature`: The signature
   - `X-Near-Message`: The signed message
   - `X-Near-Nonce`: The nonce used for signing

2. Validate the signature against the message and public key

3. If valid, proceed with the requested operation using the stored Twitter tokens

### Token Storage

Tokens are stored with platform-specific keys in the format:
```
{platform}:{nearAccountId}:{userId}
```

For example:
```
twitter:alice.near:12345
```

This allows for multi-platform support and secure token management.

## Security Considerations

- NEAR signatures provide cryptographic proof of identity
- Each request is authenticated with a unique signature
- Tokens are stored securely and associated with specific NEAR accounts
- The backend validates all signatures before processing requests

## Next Steps

- Implement additional social media platforms
- Add support for media uploads
- Enhance error handling and user feedback
- Implement token refresh logic
