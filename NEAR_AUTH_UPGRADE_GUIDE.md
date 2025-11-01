# NEAR Authentication Upgrade Guide

This guide documents the improvements made to NEAR authentication in the OpenCrosspost Proxy
Service.

## What Changed

### 1. Updated Dependencies

- **near-sign-verify**: Upgraded from `0.3.6` to `^0.4.1` for improved security and bug fixes
- Location: `deno.json`

### 2. Environment Configuration (Breaking Change)

Added new environment variables for better NEAR auth configuration:

```bash
# Required: The expected recipient for NEAR auth tokens
NEAR_EXPECTED_RECIPIENT=crosspost.near

# Optional: Maximum age for nonces in milliseconds (default: 300000 = 5 minutes)
NEAR_NONCE_MAX_AGE_MS=300000

# Optional: Whether to require full access keys (default: false)
NEAR_REQUIRE_FULL_ACCESS_KEY=false
```

**Migration Action**: Add these environment variables to your `.env` file or deployment
configuration.

### 3. Enhanced Security - Signature Required on All Requests (Breaking Change)

Previously, GET requests only required the `X-Near-Account` header. Now **all requests** require a
properly signed NEAR auth token via the `Authorization: Bearer <token>` header.

**Why**: This significantly improves security by:

- Preventing header spoofing attacks
- Ensuring all requests are properly authenticated
- Maintaining consistent auth flow across all endpoints

### 4. SDK Changes (Breaking Change)

The `CrosspostClient` now **requires** an `authToken` parameter:

**Before:**

```typescript
const client = new CrosspostClient({
  baseUrl: 'https://api.opencrosspost.com/',
});
```

**After:**

```typescript
import { signMessage } from '@near-wallet-selector/core';

// Get signed token from NEAR wallet
const authToken = await signMessage({
  message: 'Login to OpenCrosspost',
  recipient: 'crosspost.near',
  nonce: Buffer.from(crypto.getRandomValues(new Uint8Array(32))),
});

const client = new CrosspostClient({
  baseUrl: 'https://api.opencrosspost.com/',
  authToken: authToken, // Now required
});
```

### 5. Request Options Update

The `RequestOptions` interface no longer includes:

- `accountId` field (removed, no longer needed)

The `authToken` field is now **required** instead of optional.

## Backend Changes

### Files Modified

1. **deno.json**
   - Updated `near-sign-verify` version

2. **src/config/env.ts**
   - Added NEAR auth configuration interface
   - Added environment variable parsing
   - Added validation for NEAR config

3. **src/infrastructure/security/near-auth-service.ts**
   - Now uses environment configuration instead of hardcoded values
   - Improved error messages with context
   - Better logging in development mode

4. **src/middleware/auth.middleware.ts**
   - Removed special handling for GET requests
   - All requests now require full signature verification

## SDK Changes

### Files Modified

1. **packages/sdk/src/core/config.ts**
   - `authToken` is now required (not optional)

2. **packages/sdk/src/core/request.ts**
   - Removed `accountId` field
   - Always sends `Authorization` header for all HTTP methods
   - Updated error messages

3. **packages/sdk/src/core/client.ts**
   - Constructor now requires `authToken` in config
   - Removed `setAccountHeader()` method
   - Updated documentation

## Testing Changes

### Files Modified

1. **tests/utils/test-utils.ts**
   - Updated mock auth token format to match NEP-413
   - Simplified mock context creation

## Migration Checklist

### For Backend Deployment

- [ ] Add new environment variables:
  - `NEAR_EXPECTED_RECIPIENT`
  - `NEAR_NONCE_MAX_AGE_MS` (optional)
  - `NEAR_REQUIRE_FULL_ACCESS_KEY` (optional)

- [ ] Run `deno cache --reload deps.ts` to update dependencies

- [ ] Test authentication flow with real NEAR wallets

- [ ] Monitor logs for any auth failures during rollout

### For SDK/Frontend Users

- [ ] Update SDK initialization to always provide `authToken`

- [ ] Remove any usage of `setAccountHeader()` method

- [ ] Remove any logic that only passed `accountId` for GET requests

- [ ] Update NEAR wallet integration to sign messages for all requests

- [ ] Test all API operations (GET, POST, DELETE, etc.)

## Example Frontend Integration

### React with NEAR Wallet Selector

```typescript
import { useEffect, useState } from 'react';
import { setupWalletSelector } from '@near-wallet-selector/core';
import { setupModal } from '@near-wallet-selector/modal-ui';
import { CrosspostClient } from '@crosspost/sdk';

function App() {
  const [client, setClient] = useState<CrosspostClient | null>(null);

  useEffect(() => {
    async function initNear() {
      const selector = await setupWalletSelector({
        network: 'mainnet',
        modules: [/* your wallet modules */],
      });

      const modal = setupModal(selector, {
        contractId: 'crosspost.near',
      });

      // Get the wallet
      const wallet = await selector.wallet();

      // Sign a message for authentication
      const authToken = await wallet.signMessage({
        message: 'Login to OpenCrosspost',
        recipient: 'crosspost.near',
        nonce: Buffer.from(crypto.getRandomValues(new Uint8Array(32))),
      });

      // Create client with auth token
      const crosspostClient = new CrosspostClient({
        baseUrl: process.env.REACT_APP_API_URL,
        authToken: JSON.stringify(authToken),
      });

      setClient(crosspostClient);
    }

    initNear();
  }, []);

  return <div>{/* Your app */}</div>;
}
```

## Security Benefits

1. **Signature Required on All Requests**: Prevents unauthorized access even if someone guesses an
   account ID
2. **Configurable Token Expiry**: Better control over token lifetime
3. **Environment-Based Configuration**: Different settings for dev/staging/production
4. **Better Error Messages**: Easier debugging of auth issues
5. **Consistent Auth Flow**: Same verification process for all endpoints

## Rollback Plan

If issues arise, you can roll back by:

1. Revert the changes in git: `git revert <commit-hash>`
2. Or temporarily allow GET requests without signatures by modifying
   `src/middleware/auth.middleware.ts`:

```typescript
// Temporary rollback - not recommended for production
if (c.req.method === 'GET') {
  signerId = AuthMiddleware.nearAuthService.extractNearAccountHeader(c);
} else {
  const { signerId: validatedSignerId } = await AuthMiddleware.nearAuthService
    .extractAndValidateNearAuth(c);
  signerId = validatedSignerId;
}
```

## Support

For issues or questions:

1. Check the logs for detailed error messages
2. Verify environment variables are set correctly
3. Ensure NEAR wallet is properly signing messages
4. Test with `ENVIRONMENT=development` for verbose logging

## Version Compatibility

- **Backend API**: v2.0.0+
- **SDK**: v2.0.0+
- **near-sign-verify**: v0.4.1+
- **NEAR Protocol**: Mainnet and Testnet compatible

## Breaking Changes Summary

1. ✅ `authToken` is now required for all requests (including GET)
2. ✅ `CrosspostClient` constructor requires `authToken` parameter
3. ✅ `X-Near-Account` header is no longer supported
4. ✅ New environment variables required
5. ✅ `setAccountHeader()` method removed from SDK
