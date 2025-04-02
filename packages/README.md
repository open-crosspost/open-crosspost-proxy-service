# Crosspost API SDK Monorepo

This monorepo contains the SDK packages for the Crosspost API.

## Packages

- [@crosspost/types](./types) - Shared TypeScript type definitions
- [@crosspost/near-simple-signing](./near-simple-signing) - NEAR wallet signature generation utility
- [@crosspost/sdk](./sdk) - Main API client SDK

## Development

### Prerequisites

- [Bun](https://bun.sh/) - Fast JavaScript runtime and package manager

### Setup

```bash
# Install dependencies for all packages
bun install
```

### Build

```bash
# Build all packages
bun run build

# Build a specific package
bun run build:types
bun run build:near-simple-signing
bun run build:sdk
```

### Development Mode

```bash
# Run development mode for all packages
bun run dev

# Run development mode for a specific package
bun run dev:types
bun run dev:near-simple-signing
bun run dev:sdk
```

### Lint

```bash
# Lint all packages
bun run lint

# Lint a specific package
bun run lint:types
bun run lint:near-simple-signing
bun run lint:sdk
```

### Type Check

```bash
# Type check all packages
bun run typecheck

# Type check a specific package
bun run typecheck:types
bun run typecheck:near-simple-signing
bun run typecheck:sdk
```

### Clean

```bash
# Clean all packages
bun run clean

# Clean a specific package
bun run clean:types
bun run clean:near-simple-signing
bun run clean:sdk
```

## Package Dependencies

The packages have the following dependencies:

```
@crosspost/sdk
  ├── @crosspost/types
  └── @crosspost/near-simple-signing
```

## Usage

See the individual package READMEs for usage instructions:

- [@crosspost/types README](./types/README.md)
- [@crosspost/near-simple-signing README](./near-simple-signing/README.md)
- [@crosspost/sdk README](./sdk/README.md)

## License

MIT
