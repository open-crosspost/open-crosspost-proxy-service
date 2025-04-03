# @crosspost/types

Shared type definitions for the Crosspost API ecosystem.

## Overview

This package contains TypeScript type definitions used across the Crosspost API ecosystem, including:

- Common types (PlatformName, ApiErrorCode, etc.)
- Request types for all API endpoints
- Response types for all API endpoints

## Installation

### Node.js / npm

```bash
# Using npm
npm install @crosspost/types

# Using yarn
yarn add @crosspost/types

# Using pnpm
pnpm add @crosspost/types

# Using bun
bun add @crosspost/types
```

### Deno

```typescript
// Import from JSR
import { PlatformName } from "@crosspost/types";

// Or import directly from GitHub
import { PlatformName } from "https://raw.githubusercontent.com/your-org/crosspost/main/packages/types/mod.ts";
```

## Usage

```typescript
import { PlatformName, CreatePostRequest, CreatePostResponse } from "@crosspost/types";

// Use the types in your code
const platform: PlatformName = "twitter";

const request: CreatePostRequest = {
  content: {
    text: "Hello, world!"
  }
};

// Type checking for responses
function handleResponse(response: CreatePostResponse) {
  console.log(`Post created with ID: ${response.id}`);
}
```

## Available Types

### Common Types

- `PlatformName` - Supported social media platforms
- `ApiErrorCode` - Error codes returned by the API
- `ApiError` - Error structure returned by the API

### Request Types

- Authentication requests
- Post creation and management requests
- Media upload requests
- Rate limit requests

### Response Types

- Authentication responses
- Post creation and management responses
- Media upload responses
- Rate limit responses

## License

MIT
