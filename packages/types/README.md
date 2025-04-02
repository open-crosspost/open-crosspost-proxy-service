# @crosspost/types

Shared TypeScript type definitions for the Crosspost API ecosystem.

## Overview

This package contains TypeScript type definitions used across the Crosspost API ecosystem, including:

- Request types for all API endpoints
- Response types for all API endpoints
- Common types shared between frontend and backend
- Platform-specific types
- Error types

## Installation

```bash
npm install @crosspost/types
# or
yarn add @crosspost/types
# or
pnpm add @crosspost/types
# or
bun add @crosspost/types
```

## Usage

Import the types you need in your TypeScript code:

```typescript
import { 
  PostRequest, 
  PostResponse, 
  PlatformName,
  ErrorDetail 
} from '@crosspost/types';

// Use the types in your code
const request: PostRequest = {
  platform: 'twitter',
  content: {
    text: 'Hello, world!'
  }
};

// Type-safe response handling
function handleResponse(response: PostResponse) {
  if (response.success) {
    console.log(`Post created with ID: ${response.data.id}`);
  } else {
    console.error('Error creating post:', response.errors);
  }
}
```

## Type Categories

### Request Types

Types for API request payloads:

- `AuthRequest` - Authentication requests
- `PostRequest` - Post creation requests
- `MediaUploadRequest` - Media upload requests
- etc.

### Response Types

Types for API response payloads:

- `AuthResponse` - Authentication responses
- `PostResponse` - Post creation responses
- `MediaUploadResponse` - Media upload responses
- etc.

### Common Types

Shared types used across the API:

- `PlatformName` - Supported social media platforms
- `ErrorDetail` - Standardized error format
- `EnhancedApiResponse` - Base response format
- etc.

## License

MIT
