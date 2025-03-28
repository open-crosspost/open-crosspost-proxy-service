# Deno Compatibility Tests for Twitter API Proxy

This directory contains tests to verify the compatibility of `twitter-api-v2` and its plugins with Deno. These tests will help determine if migrating the Twitter API Proxy from Cloudflare Workers to Deno is feasible.

## Prerequisites

1. Install Deno:
   ```bash
   # macOS or Linux
   curl -fsSL https://deno.land/x/install/install.sh | sh
   
   # Windows (PowerShell)
   irm https://deno.land/install.ps1 | iex
   ```

2. Make sure Deno is in your PATH

3. Install npm dependencies for Deno:
   ```bash
   cd deno-test
   ./install-deps.sh
   ```
   This will create a node_modules directory, install all the npm packages specified in deno.json, and generate a lock file.

   Alternatively, you can run:
   ```bash
   cd deno-test
   deno cache --reload --node-modules-dir .
   ```

## Running the Tests

### Basic Twitter API Compatibility Test

Tests if the core `twitter-api-v2` library can be imported and used in Deno:

```bash
deno run --allow-net --allow-env --allow-read twitter-api-test.ts
```

### Twitter API Plugins Compatibility Test

Tests if the Twitter API plugins (rate limiting, token refresher) can be imported and used in Deno:

```bash
deno run --allow-net --allow-env --allow-read twitter-plugins-test.ts
```

### Twitter API Redis Plugin Compatibility Test

Tests if the Twitter API Redis cache plugin and Upstash Redis can be imported and used in Deno:

```bash
deno run --allow-net --allow-env --allow-read twitter-redis-test.ts
```

### Minimal Twitter Proxy Server

A simple Deno server that demonstrates how a Twitter API proxy might work with Deno:

```bash
deno run --allow-net --allow-env twitter-proxy-server.ts
```

Then visit:
- http://localhost:8000/ - Server info
- http://localhost:8000/auth/twitter - Get Twitter auth URL
- http://localhost:8000/api/me?userId=[userId] - Get user info (requires authentication)

### Deno KV Token Storage Example

An example of how to use Deno's built-in KV store for token storage:

```bash
deno run --allow-net --allow-env --allow-read --allow-write --unstable-kv deno-kv-token-storage.ts
```

Note: The `--unstable-kv` flag is required as Deno KV is currently an unstable API.

This demonstrates how to:
- Initialize Deno KV
- Store tokens in Deno KV
- Retrieve tokens from Deno KV
- Delete tokens from Deno KV

## Expected Results

If all tests pass, you should see output indicating successful imports and object creation without errors. This would suggest that migrating to Deno is feasible.

If there are errors, they will be displayed in the console. These errors would need to be addressed before migration.

## Next Steps After Testing

If the tests are successful:

1. Create a proper Deno project structure
2. Migrate the token storage to use Deno KV or Upstash Redis
3. Convert the existing Node.js code to Deno
4. Update the build and deployment process for Deno Deploy
5. Test the migrated application thoroughly

If the tests fail:

1. Identify the specific compatibility issues
2. Consider creating compatibility wrappers for problematic components
3. Evaluate alternative libraries or approaches
4. Consider other deployment options like Vercel Serverless Functions
