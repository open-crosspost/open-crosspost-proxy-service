# Crosspost API SDK

This monorepo contains the SDK packages for interacting with the Crosspost API.

## Packages

| Package                     | Description             | npm | JSR |
| --------------------------- | ----------------------- | --- | --- |
| [@crosspost/types](./types) | Shared type definitions | ✅  | ✅  |
| [@crosspost/sdk](./sdk)     | Main API client SDK     | ✅  | ❌  |

## Installation

### Node.js / npm

```bash
# Install all packages
npm install @crosspost/sdk @crosspost/types

# Or install individual packages
npm install @crosspost/sdk
npm install @crosspost/types
```

### Deno

```typescript
// Import from JSR
import { PlatformName } from '@crosspost/types';

import { PlatformName } from 'https://raw.githubusercontent.com/your-org/crosspost/main/packages/types/mod.ts';
```

## Usage Example

```typescript
import { CrosspostClient } from '@crosspost/sdk';
import { CreatePostRequest } from '@crosspost/types';

// Create a post
const request: CreatePostRequest = {
  content: {
    text: 'Hello from Crosspost SDK!',
  },
};

const response = await client.twitter.createPost(request);
console.log(`Post created with ID: ${response.id}`);
```

## Development

### Building

```bash
# Build all packages for Node.js
npm run build:node

# Build packages for Deno
npm run build:deno

# Build all packages for all environments
npm run build:all
```

### Testing

```bash
# Run tests for all packages
npm test

# Run tests for a specific package
npm run test:types
npm run test:sdk
```

### Linting

```bash
# Lint all packages
npm run lint

# Lint a specific package
npm run lint:types
npm run lint:sdk
```

## Publishing

### npm

```bash
# Publish all packages to npm
npm run publish

# Publish a specific package to npm
cd types && npm publish
cd sdk && npm publish
```

### JSR (Deno)

```bash
# Publish to JSR
cd types && deno publish
```

## License

MIT
