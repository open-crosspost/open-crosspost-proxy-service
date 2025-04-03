# Types and Schemas Organization

This document outlines the organization of types and schemas in the Crosspost project.

## Overview

The project uses a centralized approach for type safety and validation:

1. **Zod Schemas**: Defined in the `packages/types/src` directory, these provide runtime validation of API requests and responses.
2. **TypeScript Types**: Derived from Zod schemas using `z.infer<typeof schemaName>`, these provide static type checking during development.

This approach ensures that types and schemas are always in sync, as the TypeScript types are derived directly from the Zod schemas.

## Types Package (`packages/types`)

The types package is the single source of truth for both Zod schemas and TypeScript types. It's organized by domain rather than by request/response:

```
packages/types/src/
├── index.ts                # Main exports
├── auth.ts                 # Auth schemas and derived types
├── post.ts                 # Post schemas and derived types
├── media.ts                # Media schemas and derived types
├── leaderboard.ts          # Leaderboard schemas and derived types
├── rate-limit.ts           # Rate limit schemas and derived types
├── common.ts               # Common schemas and types
├── response.ts             # Response schemas and types
└── errors/                 # Error schemas and types
    ├── index.ts            # Error exports
    ├── api-error.ts        # API error schemas and types
    ├── base-error.ts       # Base error schemas and types
    └── platform-error.ts   # Platform error schemas and types
```

### Schema and Type Definition

Each domain file contains both the Zod schemas and the derived TypeScript types:

```typescript
// packages/types/src/auth.ts
import { z } from "zod";
import { EnhancedResponseSchema } from "./response.ts";
import { PlatformSchema } from "./common.ts";

// Platform parameter schema
export const PlatformParamSchema = z.object({
  platform: z.string().describe('Social media platform'),
}).describe('Platform parameter');

// Auth initialization request schema
export const AuthInitRequestSchema = z.object({
  successUrl: z.string().url().optional().describe('URL to redirect to on successful authentication'),
  errorUrl: z.string().url().optional().describe('URL to redirect to on authentication error'),
}).describe('Auth initialization request');

// Derive TypeScript types from Zod schemas
export type PlatformParam = z.infer<typeof PlatformParamSchema>;
export type AuthInitRequest = z.infer<typeof AuthInitRequestSchema>;
```

### Enhanced Response Types

The enhanced response types provide a consistent format for API responses:

```typescript
// packages/types/src/response.ts
import { z } from "zod";

// Define the schema
export const EnhancedResponseSchema = <T extends z.ZodTypeAny>(schema: T) => 
  z.object({
    success: z.boolean(),
    data: schema,
    meta: z.object({
      // metadata properties...
    }).optional(),
  });

// Derive the type
export type EnhancedApiResponse<T> = {
  success: boolean;
  data: T;
  meta?: {
    rateLimit?: { ... };
    pagination?: { ... };
  };
};
```

## API Usage

The API imports schemas and types from the types package:

### Validation Middleware

```typescript
// src/middleware/validation.middleware.ts
import { AuthInitRequestSchema } from '@crosspost/types/deno_dist/auth.ts';

// Use schema for validation
const result = AuthInitRequestSchema.safeParse(request.body);
if (!result.success) {
  return c.json({ error: result.error }, 400);
}
```

### Controllers

```typescript
// src/controllers/auth.controller.ts
import { AuthInitRequest, AuthUrlResponse } from '@crosspost/types/deno_dist/auth.ts';

// Use types for type safety
const handleAuthInit = async (c: Context): Promise<Response> => {
  const body: AuthInitRequest = await c.req.json();
  // Implementation...
  const response: AuthUrlResponse = {
    success: true,
    data: {
      url: authUrl,
      state,
      platform
    }
  };
  return c.json(response);
};
```

## SDK Usage

The SDK uses the derived types from the types package:

```typescript
// packages/sdk/src/platforms/twitter-client.ts
import { PostCreateRequest, PostResponse } from '@crosspost/types';

export class TwitterClient {
  async createPost(request: PostCreateRequest): Promise<PostResponse> {
    // Implementation...
  }
}
```

## Benefits of This Approach

1. **Single Source of Truth**: The types package is the single source of truth for both types and validation schemas.

2. **Type Safety**: Both the API and SDK benefit from type safety, reducing the risk of runtime errors.

3. **Maintainability**: Changes to the data model only need to be made in one place (the types package).

4. **Clear Separation of Concerns**: Each domain file has a clear responsibility: defining the data model for a specific domain.

5. **Consistency**: The TypeScript types are always in sync with the Zod schemas, ensuring consistent validation and type checking.

## Best Practices

1. **Keep schemas and types together**: Define Zod schemas and derive TypeScript types in the same file.

2. **Organize by domain**: Group schemas and types by domain rather than by request/response.

3. **Use descriptive names**: Use clear, descriptive names for schemas and types.

4. **Add descriptions to schemas**: Use `.describe()` to add descriptions to schema properties for better documentation.

5. **Export both schemas and types**: Export both the Zod schemas and the derived TypeScript types.
