# Twitter API Proxy (Deno Version)

A secure Deno-based proxy for the Twitter API that allows authorized frontends to perform Twitter actions on behalf of users who have granted permission. The system securely stores OAuth tokens, handles refreshes, enforces rate limits, and supports all major Twitter API functions including media uploads.

## Migration to Deno

This project has been migrated from Cloudflare Workers to Deno for improved compatibility with the twitter-api-v2 library and its plugins. The migration includes:

- Replacing Cloudflare KV with Deno KV for token storage
- Replacing itty-router with Hono for HTTP routing
- Updating the project structure to follow Deno conventions
- Implementing proper error handling and middleware for Deno

## Project Structure

```
/
  deno.json               # Deno configuration
  deps.ts                 # Central dependencies file
  main.ts                 # Main entry point
  /src
    /api                  # API controllers and validation
    /config               # Configuration
    /domain               # Business logic
    /infrastructure       # External services and storage
    /middleware           # HTTP middleware
    /types                # TypeScript types
```

## Getting Started

### Prerequisites

- [Deno](https://deno.land/) (latest version)
- Twitter API credentials

### Environment Variables

Create a `.env` file with the following variables:

```
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret
ENCRYPTION_KEY=your_encryption_key
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
API_KEYS={"your_api_key":["http://localhost:3000"]}
ENVIRONMENT=development
```

### Running Locally

```bash
# Start the development server
deno task dev

# Format code
deno task fmt

# Lint code
deno task lint

# Run tests
deno task test
```

### Deployment

The application can be deployed to Deno Deploy:

```bash
# Deploy to Deno Deploy
deno deploy
```

## API Endpoints

### Authentication

- `POST /auth/init` - Initialize OAuth flow
- `POST /auth/callback` - Handle OAuth callback
- `POST /auth/refresh` - Refresh OAuth token
- `DELETE /auth/revoke` - Revoke OAuth token
- `GET /auth/status` - Check token status

### Posts

- `POST /api/post` - Create a post
- `POST /api/repost` - Repost a post
- `POST /api/quote` - Quote a post
- `DELETE /api/post/:id` - Delete a post
- `POST /api/reply` - Reply to a post
- `POST /api/like/:id` - Like a post
- `DELETE /api/like/:id` - Unlike a post

### Media

- `POST /api/media/upload` - Upload media
- `GET /api/media/status/:id` - Check media status
- `POST /api/media/:id/metadata` - Update media metadata

### Rate Limits

- `GET /api/rate-limit/:endpoint?` - Get rate limit status for an endpoint
- `GET /api/rate-limit` - Get all rate limits

## Authentication

The API uses API keys for client authentication and user IDs for user context. Include the following headers in your requests:

- `X-API-Key`: Your API key
- `X-User-ID`: The user ID for which to perform actions

## Error Handling

The API returns structured error responses with the following format:

```json
{
  "error": {
    "type": "error_type",
    "message": "Error message",
    "status": 400,
    "details": {}
  }
}
```

## Security

- OAuth tokens are encrypted before storage in Deno KV
- API keys are validated against allowed origins
- CORS is configured to only allow requests from allowed origins
- Input validation is performed on all requests

## License

MIT
