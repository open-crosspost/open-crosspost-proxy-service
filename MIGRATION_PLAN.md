# Detailed File Structure & Deletion Plan

## 🗑️ What Gets DELETED

### Complete Folder Deletions:
```
packages/sdk/                          # DELETE ENTIRE FOLDER
├── src/
│   ├── api/                          # All API classes replaced by plugin
│   │   ├── activity.ts               # → plugin/src/contract.ts (activity procedures)
│   │   ├── auth.ts                   # → plugin/src/contract.ts (auth procedures)
│   │   ├── post.ts                   # → plugin/src/contract.ts (post procedures)
│   │   └── system.ts                 # → plugin/src/contract.ts (system procedures)
│   ├── core/
│   │   ├── client.ts                 # Replaced by plugin runtime
│   │   ├── config.ts                 # → plugin variables/secrets
│   │   └── request.ts                # → plugin/src/service.ts (makeRequest)
│   ├── utils/
│   │   ├── error.ts                  # → plugin error handling with CommonPluginErrors
│   │   └── popup.ts                  # Keep if needed for OAuth, otherwise delete
│   └── index.ts                      # Replaced by plugin exports
├── bun.lock                          # DELETE
├── deno.json                         # DELETE
├── LICENSE                           # Can move to plugin if needed
├── mod.ts                            # DELETE
├── package.json                      # DELETE
├── README.md                         # DELETE (will have plugin README)
├── tsconfig.json                     # DELETE
└── tsconfig.node.json                # DELETE

tests/sdk/                            # DELETE (replaced by plugin tests)
tests/integration/sdk/                # DELETE (replaced by plugin integration tests)
```

### Files to Keep (In packages/types):
```
packages/types/                       # KEEP - Contract definitions
├── src/
│   ├── activity.ts                   # KEEP - Activity types & schemas
│   ├── auth.ts                       # KEEP - Auth types & schemas
│   ├── common.ts                     # KEEP - Platform enum, StatusCode
│   ├── errors.ts                     # KEEP - Error codes & types
│   ├── index.ts                      # KEEP - Barrel exports
│   ├── post.ts                       # KEEP - Post types & schemas
│   ├── rate-limit.ts                 # KEEP - Rate limit types
│   ├── response.ts                   # KEEP - Response types
│   └── user-profile.ts               # KEEP - User profile types
└── ... (config files stay)
```

---

## 📁 New Plugin File Structure

```
plugin/
├── src/
│   ├── contract.ts                   # oRPC contract definition
│   ├── service.ts                    # HTTP client service
│   ├── index.ts                      # Plugin entry point
│   ├── types/                        # NEW FOLDER
│   │   ├── index.ts                  # Re-exports from @crosspost/types
│   │   └── auth.ts                   # Plugin-specific auth types (NearAuthData handling)
│   ├── errors/                       # NEW FOLDER
│   │   └── error-mapping.ts          # CrosspostError → CommonPluginErrors
│   ├── utils/                        # NEW FOLDER (optional)
│   │   ├── auth-helpers.ts           # NEAR signature generation helpers
│   │   └── request-helpers.ts        # URL building, query params
│   └── __tests__/
│       ├── unit/
│       │   ├── service.test.ts       # Test CrosspostService methods
│       │   ├── error-mapping.test.ts # Test error transformations
│       │   └── auth-helpers.test.ts  # Test auth utilities
│       └── integration/
│           ├── plugin.test.ts        # Full plugin integration tests
│           ├── auth.test.ts          # Auth endpoint tests
│           ├── post.test.ts          # Post endpoint tests
│           ├── activity.test.ts      # Activity endpoint tests
│           └── system.test.ts        # System endpoint tests
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
├── vitest.integration.config.ts
├── rspack.config.cjs
├── README.md
└── LLM.txt
```

---

## 🗺️ Detailed Code Mapping

### 1. **contract.ts** - API Contract Definition

**Maps from:** `packages/sdk/src/api/*.ts` method signatures

```typescript
// Structure:
import { CommonPluginErrors } from "every-plugin";
import { oc } from "every-plugin/orpc";
import { z } from "every-plugin/zod";
import * as Types from "@crosspost/types";

export const contract = oc.router({
  // AUTH DOMAIN (from packages/sdk/src/api/auth.ts)
  auth: oc.router({
    authorizeNearAccount: oc
      .route({ method: 'POST', path: '/auth/authorize/near' })
      .input(Types.NearAuthorizationRequestSchema)
      .output(Types.NearAuthorizationResponseSchema)
      .errors(CommonPluginErrors),
    
    getNearAuthorizationStatus: oc
      .route({ method: 'GET', path: '/auth/authorize/near/status' })
      .output(Types.NearAuthorizationStatusResponseSchema)
      .errors(CommonPluginErrors),
    
    loginToPlatform: oc
      .route({ method: 'POST', path: '/auth/{platform}/login' })
      .input(z.object({
        platform: Types.PlatformSchema,
        options: Types.AuthInitRequestSchema.optional()
      }))
      .output(z.union([
        Types.AuthCallbackResponseSchema,
        Types.AuthUrlResponseSchema
      ]))
      .errors(CommonPluginErrors),
    
    // ... 6 more auth methods
  }),

  // POST DOMAIN (from packages/sdk/src/api/post.ts)
  post: oc.router({
    create: oc
      .route({ method: 'POST', path: '/api/post' })
      .input(Types.CreatePostRequestSchema)
      .output(z.object({ data: Types.MultiStatusDataSchema }))
      .errors(CommonPluginErrors),
    
    delete: oc
      .route({ method: 'DELETE', path: '/api/post' })
      .input(Types.DeletePostRequestSchema)
      .output(z.object({ data: Types.MultiStatusDataSchema }))
      .errors(CommonPluginErrors),
    
    // ... 5 more post methods
  }),

  // ACTIVITY DOMAIN (from packages/sdk/src/api/activity.ts)
  activity: oc.router({
    getLeaderboard: oc
      .route({ method: 'GET', path: '/api/activity' })
      .input(Types.ActivityLeaderboardQuerySchema.optional())
      .output(Types.ActivityLeaderboardResponseSchema)
      .errors(CommonPluginErrors),
    
    // ... 2 more activity methods
  }),

  // SYSTEM DOMAIN (from packages/sdk/src/api/system.ts)
  system: oc.router({
    getRateLimits: oc
      .route({ method: 'GET', path: '/api/rate-limit' })
      .output(Types.RateLimitResponseSchema)
      .errors(CommonPluginErrors),
    
    // ... 2 more system methods
  }),
});

export type Contract = typeof contract;
```

**Total procedures:** ~20 (9 auth + 7 post + 3 activity + 3 system)

---

### 2. **service.ts** - HTTP Client Service

**Maps from:** `packages/sdk/src/core/request.ts` + API method implementations

```typescript
import { Effect } from "every-plugin/effect";
import { createAuthToken, type NearAuthData } from "near-sign-verify";
import type * as Types from "@crosspost/types";
import { mapToCrosspostError } from "./errors/error-mapping";

export class CrosspostService {
  constructor(
    private readonly baseUrl: string,
    private readonly nearAuthData: NearAuthData,
    private readonly timeout: number
  ) {}

  // ============ AUTH METHODS ============
  // From packages/sdk/src/api/auth.ts
  
  authorizeNearAccount() {
    return this.makeRequest<Types.NearAuthorizationResponse>(
      'POST',
      '/auth/authorize/near',
      {}
    );
  }

  getNearAuthorizationStatus() {
    return this.makeRequest<Types.NearAuthorizationResponse>(
      'GET',
      '/auth/authorize/near/status'
    );
  }

  loginToPlatform(platform: Types.Platform, options?: Types.AuthInitRequest) {
    return this.makeRequest<Types.AuthUrlResponse | Types.AuthCallbackResponse>(
      'POST',
      `/auth/${platform}/login`,
      options || { redirect: false }
    );
  }

  // ... +6 more auth methods

  // ============ POST METHODS ============
  // From packages/sdk/src/api/post.ts
  
  createPost(request: Types.CreatePostRequest) {
    return this.makeRequest<Types.MultiStatusData>(
      'POST',
      '/api/post',
      request
    );
  }

  deletePost(request: Types.DeletePostRequest) {
    return this.makeRequest<Types.MultiStatusData>(
      'DELETE',
      '/api/post',
      request
    );
  }

  // ... +5 more post methods

  // ============ ACTIVITY METHODS ============
  // From packages/sdk/src/api/activity.ts
  
  getLeaderboard(query?: Types.ActivityLeaderboardQuery) {
    return this.makeRequest<Types.ActivityLeaderboardResponse>(
      'GET',
      '/api/activity',
      undefined,
      query
    );
  }

  // ... +2 more activity methods

  // ============ SYSTEM METHODS ============
  // From packages/sdk/src/api/system.ts
  
  getRateLimits() {
    return this.makeRequest<Types.RateLimitResponse>(
      'GET',
      '/api/rate-limit'
    );
  }

  // ... +2 more system methods

  // ============ PRIVATE HELPERS ============
  // Adapted from packages/sdk/src/core/request.ts
  
  private makeRequest<T>(
    method: string,
    path: string,
    data?: unknown,
    query?: Record<string, unknown>
  ) {
    return Effect.tryPromise({
      try: async () => {
        const url = new URL(path, this.baseUrl);
        
        // Add query parameters
        if (query) {
          Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              url.searchParams.append(key, String(value));
            }
          });
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };

        // Authentication
        if (method === 'GET') {
          headers['X-Near-Account'] = this.nearAuthData.account_id;
        } else {
          headers['Authorization'] = `Bearer ${createAuthToken(this.nearAuthData)}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const response = await fetch(url, {
            method,
            headers,
            body: method !== 'GET' && data ? JSON.stringify(data) : undefined,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const responseData = await response.json();

          if (!response.ok) {
            throw mapToCrosspostError(responseData, response.status);
          }

          return responseData.data as T;
        } finally {
          clearTimeout(timeoutId);
        }
      },
      catch: (error: unknown) => {
        if (error instanceof Error) {
          return error;
        }
        return new Error(String(error));
      }
    });
  }
}
```

---

### 3. **index.ts** - Plugin Entry Point

**Maps from:** `packages/sdk/src/index.ts` + `packages/sdk/src/core/client.ts`

```typescript
import { createPlugin } from "every-plugin";
import { Effect } from "every-plugin/effect";
import { implement } from "every-plugin/orpc";
import { z } from "every-plugin/zod";
import { contract } from "./contract";
import { CrosspostService } from "./service";
import { NearAuthDataSchema } from "./types/auth";

export default createPlugin({
  id: "@crosspost/plugin",
  
  variables: z.object({
    baseUrl: z.string().url().default("https://api.crosspost.near"),
    timeout: z.number().min(1000).max(60000).default(10000),
  }),
  
  secrets: z.object({
    // Store as JSON string, parse into NearAuthData
    nearAuthData: z.string()
      .transform((str) => JSON.parse(str))
      .pipe(NearAuthDataSchema),
  }),
  
  contract,
  
  initialize: (config) =>
    Effect.gen(function* () {
      const service = new CrosspostService(
        config.variables.baseUrl,
        config.secrets.nearAuthData,
        config.variables.timeout
      );
      
      // Test connection
      yield* service.getRateLimits();
      
      return { service };
    }),
  
  shutdown: () => Effect.void,
  
  createRouter: (context) => {
    const { service } = context;
    const os = implement(contract);
    
    // AUTH HANDLERS
    const authRouter = os.auth.router({
      authorizeNearAccount: os.auth.authorizeNearAccount.handler(async () => {
        return await Effect.runPromise(service.authorizeNearAccount());
      }),
      
      getNearAuthorizationStatus: os.auth.getNearAuthorizationStatus.handler(async () => {
        return await Effect.runPromise(service.getNearAuthorizationStatus());
      }),
      
      // ... +7 more auth handlers
    });
    
    // POST HANDLERS
    const postRouter = os.post.router({
      create: os.post.create.handler(async ({ input }) => {
        const data = await Effect.runPromise(service.createPost(input));
        return { data };
      }),
      
      // ... +6 more post handlers
    });
    
    // ACTIVITY HANDLERS
    const activityRouter = os.activity.router({
      getLeaderboard: os.activity.getLeaderboard.handler(async ({ input }) => {
        return await Effect.runPromise(service.getLeaderboard(input));
      }),
      
      // ... +2 more activity handlers
    });
    
    // SYSTEM HANDLERS
    const systemRouter = os.system.router({
      getRateLimits: os.system.getRateLimits.handler(async () => {
        return await Effect.runPromise(service.getRateLimits());
      }),
      
      // ... +2 more system handlers
    });
    
    return os.router({
      auth: authRouter,
      post: postRouter,
      activity: activityRouter,
      system: systemRouter,
    });
  }
});
```

---

### 4. **errors/error-mapping.ts** - Error Transformation

**Maps from:** `packages/sdk/src/utils/error.ts`

```typescript
import { ApiErrorCode } from "@crosspost/types";

/**
 * Maps CrosspostError codes to appropriate error messages
 * Used by service to transform API errors
 */
export function mapToCrosspostError(
  responseData: any,
  statusCode: number
): Error {
  const errors = responseData.errors || [];
  const primaryError = errors[0] || {};
  
  const message = primaryError.message || `Request failed with status ${statusCode}`;
  const code = primaryError.code || ApiErrorCode.UNKNOWN_ERROR;
  
  // Create Error with additional context
  const error = new Error(message);
  (error as any).code = code;
  (error as any).statusCode = statusCode;
  (error as any).details = primaryError.details;
  (error as any).recoverable = primaryError.recoverable;
  
  return error;
}
```

---

### 5. **types/auth.ts** - Plugin-Specific Types

```typescript
import { z } from "every-plugin/zod";

// Re-export from near-sign-verify for convenience
export type { NearAuthData } from "near-sign-verify";

// Zod schema for validation
export const NearAuthDataSchema = z.object({
  account_id: z.string(),
  public_key: z.string(),
  signature: z.string(),
  message: z.string(),
  nonce: z.array(z.number()),
  recipient: z.string(),
  callback_url: z.string().optional(),
});
```

---

## 🧪 Test Suite Structure

### Unit Tests (`plugin/src/__tests__/unit/`)

**service.test.ts** - Test each service method
```typescript
describe("CrosspostService", () => {
  describe("Auth Methods", () => {
    it("should authorize NEAR account")
    it("should get authorization status")
    it("should login to platform")
    // ... +6 auth tests
  })
  
  describe("Post Methods", () => {
    it("should create post")
    it("should delete post")
    // ... +5 post tests
  })
  
  describe("Activity Methods", () => {
    it("should get leaderboard")
    // ... +2 activity tests
  })
  
  describe("System Methods", () => {
    it("should get rate limits")
    // ... +2 system tests
  })
})
```

**error-mapping.test.ts** - Test error transformations
```typescript
describe("Error Mapping", () => {
  it("should map API errors correctly")
  it("should preserve error details")
  it("should set recoverable flag")
})
```

**auth-helpers.test.ts** - Test auth utilities
```typescript
describe("Auth Helpers", () => {
  it("should generate auth tokens")
  it("should handle signature validation")
})
```

### Integration Tests (`plugin/src/__tests__/integration/`)

**plugin.test.ts** - Overall plugin functionality
```typescript
describe("Crosspost Plugin Integration", () => {
  it("should initialize successfully")
  it("should handle authentication")
  it("should shutdown cleanly")
})
```

**auth.test.ts** - Auth endpoints (9 tests)
**post.test.ts** - Post endpoints (7 tests)
**activity.test.ts** - Activity endpoints (3 tests)
**system.test.ts** - System endpoints (3 tests)

**Total Tests:** ~35-40 tests (10 unit + 25-30 integration)

---

## 📊 Summary Table

| Current Location | New Location | Action |
|-----------------|--------------|--------|
| `packages/sdk/src/api/*.ts` | `plugin/src/contract.ts` | Migrate → Delete |
| `packages/sdk/src/core/request.ts` | `plugin/src/service.ts` | Migrate → Delete |
| `packages/sdk/src/core/client.ts` | `plugin/src/index.ts` | Migrate → Delete |
| `packages/sdk/src/utils/error.ts` | `plugin/src/errors/error-mapping.ts` | Migrate → Delete |
| `packages/sdk/src/utils/popup.ts` | Decision needed | Keep or Delete |
| `packages/types/src/*` | Keep as-is | **KEEP** |
| `tests/sdk/*` | `plugin/src/__tests__/` | Migrate → Delete |
| Entire `packages/sdk/` folder | N/A | **DELETE** |

---

## ✅ Migration Checklist

Ready to implement? Here's the sequence:

1. ✅ Create plugin file structure
2. ✅ Implement contract.ts (20 procedures)
3. ✅ Implement service.ts (20 methods + helpers)
4. ✅ Implement index.ts (plugin + routers)
5. ✅ Implement error mapping
6. ✅ Implement auth helpers
7. ✅ Write unit tests (10 tests)
8. ✅ Write integration tests (25-30 tests)
9. ✅ Verify all tests pass
10. ✅ Delete `packages/sdk/` folder
11. ✅ Update root package.json workspace config
12. ✅ Update documentation
