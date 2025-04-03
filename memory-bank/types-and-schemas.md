# Types and Schemas Organization

This document outlines the organization of types and schemas in the Crosspost project after the refactoring.

## Overview

The project now uses a centralized approach for type safety and validation:

1. **Zod Schemas**: Defined in the `packages/types/src` directory, these provide runtime validation of API requests and responses.
2. **TypeScript Types**: Derived from Zod schemas using `z.infer<typeof schemaName>`, these provide static type checking during development.

This approach ensures that types and schemas are always in sync, as the TypeScript types are derived directly from the Zod schemas.

## Types Package (`packages/types`)

The types package is now the single source of truth for both Zod schemas and TypeScript types. It's organized by domain rather than by request/response:

```
packages/types/src/
├── index.ts                # Main exports
├── auth.ts                 # Auth schemas and derived types
├── post.ts                 # Post schemas and derived types
├── media.ts                # Media schemas and derived types
├── leaderboard.ts          # Leaderboard schemas and derived types
├── rate-limit.ts           # Rate limit schemas and derived types
├── common.ts               # Common schemas and types
├── error.ts                # Error schemas and types
└── enhanced-response.ts    # Enhanced response schemas and types
```

### Schema and Type Definition

Each domain file contains both the Zod schemas and the derived TypeScript types:

```typescript
// packages/types/src/post.ts
import { z } from "zod";

// Define the Zod schema
export const postSchema = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.string(),
  // other properties...
});

// Derive the TypeScript type
export type Post = z.infer<typeof postSchema>;
```

### Enhanced Response Types

The enhanced response types provide a consistent format for API responses:

```typescript
// packages/types/src/response.ts
import { z } from "zod";

// Define the schema
export const enhancedResponseSchema = <T extends z.ZodTypeAny>(schema: T) => 
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

// Helper functions
export function createEnhancedApiResponse<T>(data: T, meta?: any): EnhancedApiResponse<T> {
  // implementation...
}
```

## API Usage

The API now imports schemas and types from the types package:

### Validation Middleware

The validation middleware uses the schemas from the types package:

```typescript
// src/middleware/validation.middleware.ts
import { postSchema } from '@crosspost/types/deno_dist/post.ts';

// Use postSchema for validation
```

### Controllers

Controllers use the derived types from the types package:

```typescript
// src/controllers/post.controller.ts
import { Post, createEnhancedApiResponse } from '@crosspost/types/deno_dist/post.ts';

// Use Post type and helper functions
```

## SDK Usage

The SDK uses the derived types from the types package:

```typescript
// packages/sdk/src/post.ts
import { Post } from '@crosspost/types';

export async function createPost(post: Post): Promise<Post> {
  // implementation...
}
```

## Benefits of the New Approach

1. **Single Source of Truth**: The types package is the single source of truth for both types and validation schemas. This eliminates the risk of divergence.

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

6. **Use helper functions**: Create and export helper functions for common operations.

7. **Keep imports clean**: Import only what you need from the types package.

## Migration Status

The migration to the new approach is complete. All schemas have been moved from `src/schemas` to `packages/types/src`, and all types are now derived from these schemas. The old files have been removed, and all imports have been updated to reference the new location.

## Example: Auth Domain

```typescript
// packages/types/src/auth.ts
import { z } from "zod";
import { platformSchema } from "./common.ts";

// Auth URL request schema
export const authInitRequestSchema = z.object({
  redirectUri: z.string().url().describe('Redirect URI after authentication'),
  scopes: z.array(z.string()).describe('OAuth scopes to request'),
  successUrl: z.string().url().describe('URL to redirect to on success'),
  errorUrl: z.string().url().describe('URL to redirect to on error'),
});

// Derive the type
export type AuthInitRequest = z.infer<typeof authInitRequestSchema>;

// Auth URL response schema
export const authUrlResponseSchema = z.object({
  url: z.string().describe('Authentication URL to redirect the user to'),
  state: z.string().describe('State parameter for CSRF protection'),
  platform: platformSchema,
});

// Derive the type
export type AuthUrlResponse = z.infer<typeof authUrlResponseSchema>;

// More schemas and types...
