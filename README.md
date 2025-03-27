# Twitter API Proxy

A secure Cloudflare Workers proxy for the Twitter API that allows authorized frontends to perform Twitter actions on behalf of users who have granted permission.

## Features

- Secure OAuth 2.0 authentication with PKCE
- Token encryption and secure storage
- Automatic token refresh
- Rate limiting and circuit breaking
- Support for all major Twitter API functions
- Media upload handling
- Redis-based request caching (optional)

## API Endpoints

### Authentication Endpoints

- `POST /auth/init`: Initiates Twitter OAuth flow, returns authorization URL
- `GET /auth/callback`: Handles OAuth callback from Twitter
- `DELETE /auth/revoke`: Revokes access and removes stored tokens

### Twitter API Endpoints

#### Enhanced Tweet API

All endpoints have been enhanced to support threaded content and direct media uploads:

- `POST /api/tweet`: Post a tweet or thread with media
- `POST /api/quote`: Quote tweet (single or thread) with media
- `POST /api/reply`: Reply to a tweet (single or thread) with media
- `POST /api/retweet`: Retweet an existing tweet
- `DELETE /api/tweet/:id`: Delete a tweet
- `POST /api/like/:id`: Like a tweet
- `DELETE /api/like/:id`: Unlike a tweet

See the [examples directory](./examples/README.md) for detailed documentation and usage examples of the enhanced API.

### Media Endpoints

- `POST /api/media/upload`: Upload media for tweets
- `GET /api/media/status/:id`: Check status of media upload

## Setup

### Prerequisites

- Node.js (LTS version)
- Cloudflare account with Workers subscription
- Twitter Developer account with API credentials

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/twitter-proxy.git
   cd twitter-proxy
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Configure Wrangler:
   - Update the `wrangler.toml` file with your Cloudflare account ID
   - Create KV namespaces and D1 databases in the Cloudflare dashboard
   - Update the KV namespace and D1 database IDs in `wrangler.toml`

4. Set up environment variables:
   - Create a `.dev.vars` file with the following variables:
     ```
     TWITTER_CLIENT_ID=your_twitter_client_id
     TWITTER_CLIENT_SECRET=your_twitter_client_secret
     ENCRYPTION_KEY=your_encryption_key
     ALLOWED_ORIGINS=https://yourdomain.com,https://anotherdomain.com
     API_KEYS={"key1":["https://yourdomain.com"],"key2":["https://anotherdomain.com"]}
     ```

### Development

Start the local development server:

```bash
bun run dev
```

### Deployment

Deploy to Cloudflare Workers:

```bash
# Deploy to staging
bun run deploy:staging

# Deploy to production
bun run deploy:prod
```

## Security Considerations

- All tokens are encrypted before storage in KV
- API keys are required for all endpoints
- Strict CORS policy is enforced
- Token refresh is handled automatically
- Rate limiting is implemented for both Twitter API and client requests
- Optional Redis-based caching for improved performance and reduced API calls

## Performance Optimizations

- Rate limit tracking to avoid Twitter API limits
- Redis-based request caching to reduce duplicate API calls
- Automatic cache invalidation based on rate limit reset times

## License

MIT
