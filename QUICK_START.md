# Quick Start - NEAR Auth Migration

## 🚀 For Developers

### Environment Setup

Add these to your `.env` file:

```bash
# NEAR Authentication
NEAR_EXPECTED_RECIPIENT=crosspost.near
NEAR_NONCE_MAX_AGE_MS=300000
NEAR_REQUIRE_FULL_ACCESS_KEY=false
```

### Frontend Integration (React Example)

```typescript
import { CrosspostClient } from '@crosspost/sdk';
import { setupWalletSelector } from '@near-wallet-selector/core';

// Initialize NEAR Wallet
const selector = await setupWalletSelector({
  network: 'mainnet',
  modules: [/* your wallet modules */],
});

const wallet = await selector.wallet();

// Sign authentication message
const authToken = await wallet.signMessage({
  message: 'Login to OpenCrosspost',
  recipient: 'crosspost.near',
  nonce: Buffer.from(crypto.getRandomValues(new Uint8Array(32))),
});

// Create client with auth token
const client = new CrosspostClient({
  authToken: JSON.stringify(authToken),
});

// Use the client
const accounts = await client.auth.getConnectedAccounts();
```

### Testing Locally

```bash
# 1. Cache dependencies
deno cache --reload deps.ts

# 2. Set environment variables
export NEAR_EXPECTED_RECIPIENT=crosspost.near
export NEAR_NONCE_MAX_AGE_MS=300000
export ENVIRONMENT=development

# 3. Run the server
deno task dev

# 4. Run tests
deno task test
```

### What Changed?

#### ❌ Old Way (No longer works)

```typescript
// GET requests with just account ID
const client = new CrosspostClient({});
client.setAccountHeader('user.near');
```

#### ✅ New Way (Required)

```typescript
// All requests need signed token
const client = new CrosspostClient({
  authToken: signedNearAuthToken,
});
```

### Common Errors & Fixes

| Error                                     | Cause                     | Fix                               |
| ----------------------------------------- | ------------------------- | --------------------------------- |
| `authToken is required`                   | Missing authToken in SDK  | Add authToken to constructor      |
| `Missing or invalid Authorization header` | No signature sent         | Sign message with NEAR wallet     |
| `NEAR account is not authorized`          | Account not whitelisted   | Call `/auth/authorize/near` first |
| `Error verifying auth token`              | Invalid/expired signature | Generate new signature            |

### API Endpoints

All endpoints now require `Authorization: Bearer <token>` header:

```bash
# Authorize NEAR account (first time)
POST /auth/authorize/near
Headers: Authorization: Bearer <near-signed-token>

# Get connected accounts
GET /auth/accounts
Headers: Authorization: Bearer <near-signed-token>

# Create post
POST /api/post
Headers: Authorization: Bearer <near-signed-token>
Body: { "targets": [...], "content": "..." }
```

### Need Help?

- 📖 Full guide: `NEAR_AUTH_UPGRADE_GUIDE.md`
- 📋 Summary: `MIGRATION_SUMMARY.md`
- 🐛 Issues: Check logs with `ENVIRONMENT=development`
