# SDK to Plugin Migration Task

## Objective

Migrate the entire `packages/sdk` to the `plugin` architecture using the every-plugin framework. This will completely replace the SDK with a plugin that provides the same API functionality through the every-plugin runtime.

## Context Files (Read These First)

### Required Reading:
1. **`plugin/LLM.txt`** - Complete guide on building every-plugin plugins (architecture, patterns, best practices)
2. **`MIGRATION_PLAN.md`** - Detailed migration plan with file structure, code mapping, and deletion checklist

### Current SDK Structure:
```
packages/sdk/src/
├── api/                    # API method classes → plugin/src/contract.ts
├── core/                   # HTTP client → plugin/src/service.ts
├── utils/                  # Error handling → plugin/src/errors/
└── index.ts                # Exports → plugin/src/index.ts
```

### Target Plugin Structure:
```
plugin/src/
├── contract.ts             # 20 oRPC procedures (9 auth, 7 post, 3 activity, 3 system)
├── service.ts              # HTTP client with 20+ methods
├── index.ts                # Plugin initialization and handlers
├── types/                  # Plugin-specific types
│   └── auth.ts             # NearAuthData schema and helpers
├── errors/                 # Error mapping
│   └── error-mapping.ts    # CrosspostError → CommonPluginErrors
├── utils/                  # Helper utilities
│   └── auth-helpers.ts     # Auth token generation
└── __tests__/              # Comprehensive test suite
```

## Implementation Plan

### Phase 1: Contract & Service Foundation
1. **Create plugin file structure** - New folders and base files
2. **Implement contract.ts** - Define all 20 oRPC procedures with proper schemas
3. **Implement service.ts** - HTTP client with authentication handling
4. **Implement error-mapping.ts** - Transform backend errors to CommonPluginErrors
5. **Implement auth-helpers.ts** - NEAR signature and token utilities

### Phase 2: Handler Implementation
6. **Implement index.ts** - Plugin initialization and all 20 handlers
7. **Auth handlers** (9 endpoints) - Login, revoke, profile refresh, etc.
8. **Post handlers** (7 endpoints) - Create, delete, repost, quote, reply, like/unlike
9. **Activity handlers** (3 endpoints) - Leaderboard, account activity, account posts
10. **System handlers** (3 endpoints) - Rate limits, health status

### Phase 3: Testing
11. **Unit tests** - Test all service methods (20+) and utilities
12. **Integration tests** - Test plugin initialization and all endpoints
13. **Verify all tests pass** - Ensure comprehensive coverage

### Phase 4: Cleanup & Migration
14. **Delete packages/sdk/ folder** - Complete SDK removal
15. **Delete tests/sdk/ folder** - Remove old tests
16. **Update package.json workspaces** - Remove SDK from workspace
17. **Update documentation** - New README with plugin usage
18. **Create migration guide** - For existing SDK users

## Key Technical Points

### Authentication Flow
- Use `nearAuthData` secret (JSON string in every-plugin)
- Generate fresh signatures per request using `createAuthToken()` from `near-sign-verify`
- Handle both Bearer tokens (POST/PUT/DELETE) and X-Near-Account headers (GET)

### Error Handling
- Map CrosspostError codes to CommonPluginErrors
- Preserve error details and recoverable status
- Handle network errors, timeouts, and validation errors

### Plugin Configuration Schema
```typescript
variables: z.object({
  baseUrl: z.string().url().default("https://api.crosspost.near"),
  timeout: z.number().default(10000),
}),
secrets: z.object({
  nearAuthData: z.string().transform(
    JSON.parse
  ).pipe(NearAuthDataSchema),
}),
```

## Usage After Migration

### Before (SDK):
```typescript
import { CrosspostClient } from '@crosspost/sdk';

const client = new CrosspostClient({
  baseUrl: 'https://api.example.com',
  nearAuthData: authData
});

await client.auth.authorizeNearAccount();
```

### After (Plugin):
```typescript
import { createPluginRuntime } from 'every-plugin/runtime';

const runtime = createPluginRuntime({
  registry: {
    "@crosspost/plugin": {
      remoteUrl: "https://cdn.crosspost.near/plugin/remoteEntry.js"
    }
  }
});

const { client } = await runtime.usePlugin("@crosspost/plugin", {
  variables: { baseUrl: "https://api.crosspost.near" },
  secrets: { nearAuthData: JSON.stringify(authData) }
});

await client.auth.authorizeNearAccount();
```

## Files to Create

1. `plugin/src/contract.ts` - oRPC contract with all procedures
2. `plugin/src/service.ts` - HTTP client service
3. `plugin/src/index.ts` - Plugin initialization and handlers
4. `plugin/src/types/auth.ts` - NearAuthData schema
5. `plugin/src/errors/error-mapping.ts` - Error transformation
6. `plugin/src/utils/auth-helpers.ts` - Auth utilities
7. All test files in `plugin/src/__tests__/`

## Files to Delete

- `packages/sdk/` - Entire folder
- `tests/sdk/` - Legacy SDK tests
- `tests/integration/sdk/` - Integration tests

## Ready to Start

The migration plan provides complete code examples, file structures, and testing strategies. All necessary context is available in the referenced files. Begin with creating the plugin contract and service foundation.
