# Data Provider Playground

Template repository for building single-provider bridge data adapters for the **NEAR Intents data collection bounty**.

## 🚀 Start Here

This repo contains a complete template for implementing one of the seven supported bridge providers:

- LayerZero, Wormhole, CCTP, Across, deBridge, Axelar, or Li.Fi

**Each provider gets its own plugin** - choose one and implement it using the provided template.

## Quick Start

```bash
# Install dependencies
bun install

# Start development server (includes web UI for testing)
bun dev

# Open http://localhost:3001 to see the demo interface
```

## How to Implement a Provider

### 1. Copy the Template

```bash
cp -r packages/_plugin_template packages/your-provider-plugin
cd packages/your-provider-plugin
```

### 2. Replace Mock Implementation

Edit `src/service.ts`:

- Replace `getRates()`, `getVolumes()`, `getLiquidityDepth()`, `getListedAssets()` with real API calls
- Implement decimal normalization for `effectiveRate` calculations
- Add proper error handling for rate limits and timeouts

### 3. Update Plugin Configuration

Edit `src/index.ts`:

```typescript
id: "@your-org/your-provider-name"
```

### 4. Test Your Implementation

```bash
# Run tests (they pass with mock data, validate your real implementation)
npm test

# Use the web UI at http://localhost:3001 to visualize your data
```

## Project Structure

```bash
data-provider-playground/
├── apps/web/                    # Demo UI for testing your plugin
├── packages/
│   ├── _plugin_template/        # 👈 START HERE - Copy this to create your plugin
│   └── api/                     # API runtime that loads your plugin
└── README.md                    # This file
```

## Testing Your Plugin

The web UI helps you visualize and test your plugin:

1. **Configure routes** - Set source/destination asset pairs
2. **Set notional amounts** - USD amounts to quote
3. **Choose time windows** - 24h, 7d, 30d volumes
4. **Fetch snapshot** - See volumes, rates, liquidity, and assets
5. **Run tests** - Validate your implementation

## Environment Variables

```bash
# Required for your plugin
DATA_PROVIDER_API_KEY=your_provider_api_key

# Optional
DATA_PROVIDER_BASE_URL=https://api.yourprovider.com
DATA_PROVIDER_TIMEOUT=10000
```

## Contract Specification

Your plugin implements a single `getSnapshot` endpoint that returns:

- **volumes**: Trading volume for specified time windows
- **rates**: Exchange rates and fees for route/notional combinations
- **liquidity**: Maximum input amounts at 50bps and 100bps slippage
- **listedAssets**: Assets supported by the provider

## Available Scripts

- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications
- `bun test`: Run tests across all packages
- `bun check-types`: Check TypeScript types

## Notes

- **One provider per plugin** - Implement only the provider you chose
- **Template injection** - Use `{{SECRET_NAME}}` for secrets in runtime config
- **Error resilience** - Implement retries and rate limiting in your service methods
- **Tests pass first** - Mock implementation validates structure, real implementation must match

## License

Part of the NEAR Intents data collection system.
