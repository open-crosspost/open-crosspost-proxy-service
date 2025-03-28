# Running the Twitter Proxy API Locally

This guide explains how to run the Twitter Proxy API (Cloudflare Worker) locally for development and testing.

## Prerequisites

- Node.js (v16 or later) or Bun installed
- Twitter API credentials
- NEAR Wallet (testnet or mainnet)

## Setup Steps

### 1. Install Dependencies

First, make sure you're in the project root directory:

```bash
cd /Users/ebraem/workspace/crosspost/twitter-proxy
```

Install the project dependencies:

```bash
bun install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root based on the `.env.example` file:

```bash
cp .env.example .env
```

Edit the `.env` file and fill in your Twitter API credentials:

```
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret
ENCRYPTION_KEY=a_random_32_character_string_for_encryption
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000,http://localhost:8000
ENVIRONMENT=development
```

### 3. Start the Local Development Server

Use Wrangler to start a local development server:

```bash
bun run dev
```

This will start the Cloudflare Worker locally, typically on port 8787. You should see output similar to:

```
Starting server on port 8000...
Environment: development
Listening on http://0.0.0.0:8000/
```

### 4. Run the Example App

In a separate terminal, start the example app:

```bash
cd examples/near-twitter-example
bun install
bun start
```

This will start a local server for the example app, typically on port 5000.

### 5. Connect the Example App to the Local API

The example app is configured to connect to the local API at `http://localhost:8000`. If your local API is running on a different port, update the `API_BASE_URL` constant in `examples/near-twitter-example/app.js`:

```javascript
const API_BASE_URL = 'http://localhost:8000'; // Update this if needed
```

### 6. Testing the Integration

1. Open your browser and navigate to the example app (e.g., http://localhost:5000)
2. Sign in with your NEAR wallet
3. Connect your Twitter account
4. Post a tweet to test the integration

## Troubleshooting

### CORS Issues

If you encounter CORS issues, make sure your app's origin is included in the `ALLOWED_ORIGINS` environment variable.

### Authentication Errors

- Verify that your Twitter API credentials are correct
- Check that your NEAR wallet is properly connected
- Ensure the local API server is running

### Database Errors

For local development, Wrangler uses a local SQLite database to simulate Cloudflare D1. If you encounter database errors:

```bash
# Reset the local D1 database
wrangler d1 execute twitter-proxy-db --local --file=./schema.sql
```

### Logs

Check the terminal where you're running the local API server for logs and error messages.

## Advanced Configuration

### Custom Port

To run the local API server on a different port:

```bash
bun run dev --port 9000
```

Then update the `API_BASE_URL` in the example app accordingly.

### Persistent Storage

By default, Wrangler uses in-memory storage for KV and D1. To use persistent storage:

```bash
bun run dev --persist
```

This will store data in a `.wrangler` directory in your project.
