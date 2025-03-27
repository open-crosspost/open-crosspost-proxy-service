# Twitter API Proxy Technical Context

## Technology Stack

### Core Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Compute Platform | Cloudflare Workers | Serverless execution environment for the proxy |
| Primary Storage | Cloudflare KV | Key-value storage for tokens and configuration |
| Database | Cloudflare D1 | SQL database for complex data storage needs |
| Secrets Management | Cloudflare Workers Secrets | Secure storage for API credentials |

### Development Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | Latest | Primary development language |
| Bun | Latest | Package manager and runtime |
| Wrangler | Latest | Cloudflare Workers CLI tool |
| Jest | Latest | Testing framework |
| ESLint | Latest | Code quality and style enforcement |
| Prettier | Latest | Code formatting |

### Dependencies

| Dependency | Purpose |
|------------|---------|
| twitter-api-v2 | Twitter API communication library |
| itty-router | HTTP routing for Cloudflare Workers |
| jose | JWT handling and cryptographic operations |
| @cloudflare/workers-types | TypeScript definitions for Workers |

## Development Setup

### Prerequisites

1. Node.js (LTS version) or Bun
2. Cloudflare account with Workers subscription
3. Wrangler CLI installed globally
4. Twitter Developer account with API credentials

### Local Development Environment

```bash
# Install dependencies
bun install

# Start local development server
bun run dev

# Run tests
bun test

# Deploy to staging
bun run deploy:staging

# Deploy to production
bun run deploy:prod
```

### Environment Configuration

The project uses the following environment variables, which should be configured as Cloudflare Worker secrets:

| Variable | Purpose |
|----------|---------|
| TWITTER_CLIENT_ID | Twitter OAuth client ID |
| TWITTER_CLIENT_SECRET | Twitter OAuth client secret |
| TWITTER_API_KEY | Twitter API key (for OAuth 1.0a) |
| TWITTER_API_SECRET | Twitter API secret (for OAuth 1.0a) |
| TWITTER_ACCESS_TOKEN | Twitter access token (for OAuth 1.0a) |
| TWITTER_ACCESS_SECRET | Twitter access secret (for OAuth 1.0a) |
| ENCRYPTION_KEY | Key for encrypting stored tokens |
| ALLOWED_ORIGINS | Comma-separated list of allowed CORS origins |
| API_KEYS | JSON string of valid API keys and their associated origins |
| ENVIRONMENT | Current environment (development, staging, production) |

## Technical Constraints

### Cloudflare Workers Limitations

1. **Execution Time**: Workers have a maximum execution time of 30 seconds in the paid tier
2. **Memory Limit**: 128MB memory limit per Worker instance
3. **CPU Limit**: Workers have CPU time limits based on the plan
4. **KV Limitations**:
   - 1MB maximum value size
   - Eventually consistent replication
   - Read-heavy workload optimization

### Twitter API Constraints

1. **Rate Limits**:
   - Endpoint-specific rate limits (15-300 requests per 15-minute window)
   - App-wide rate limits
   - User-specific rate limits
2. **Media Upload Limitations**:
   - 5MB image size limit
   - 512MB video size limit (though practical limits are lower)
   - Specific format requirements
   - OAuth 1.0a required for media uploads
3. **OAuth Constraints**:
   - Token expiration and refresh requirements
   - Scope limitations

## Performance Considerations

1. **Edge Deployment**: Leverage Cloudflare's global network for low-latency responses
2. **Caching Strategy**:
   - Cache immutable responses
   - Use appropriate cache headers
   - Implement stale-while-revalidate pattern where appropriate
3. **Efficient Token Storage**:
   - Minimize KV operations
   - Batch updates when possible
4. **Rate Limit Optimization**:
   - Track rate limits proactively
   - Implement backoff strategies
   - Queue requests when approaching limits
5. **Media Upload Optimization**:
   - Use chunked uploads for large media
   - Implement proper error handling and retries
   - Monitor processing status for videos

## Security Considerations

1. **Token Security**:
   - Encrypt tokens before storing in KV
   - Implement proper key rotation
   - Never expose tokens to clients
2. **API Key Management**:
   - Validate API keys against allowed origins
   - Implement key rotation mechanism
   - Rate limit by API key
3. **CORS Security**:
   - Strict origin validation
   - Proper preflight handling
   - Minimal exposed headers
4. **Input Validation**:
   - Validate all client input
   - Sanitize data before passing to Twitter
   - Implement request size limits

## Monitoring and Observability

1. **Logging Strategy**:
   - Structured logging format
   - Different log levels (error, warn, info, debug)
   - PII redaction in logs
2. **Metrics Collection**:
   - Request counts and latencies
   - Error rates
   - Rate limit usage
   - Token refresh operations
3. **Alerting**:
   - High error rate alerts
   - Rate limit approaching alerts
   - Token refresh failure alerts
   - Unusual traffic pattern alerts

## Deployment Pipeline

1. **CI/CD Integration**:
   - GitHub Actions for automated testing and deployment
   - Environment-specific configurations
   - Automated rollbacks on failure
2. **Testing Strategy**:
   - Unit tests for core functionality
   - Integration tests for API endpoints
   - Mock Twitter API for testing
   - End-to-end tests in staging environment

## API Design

1. **Endpoint Structure**:
   - RESTful API design
   - Consistent URL patterns
   - Proper HTTP method usage
2. **Request/Response Format**:
   - JSON for all responses
   - Consistent error format
   - Proper HTTP status codes
3. **Authentication**:
   - API key for client authentication
   - User ID for user context
   - OAuth tokens managed by the proxy
4. **Documentation**:
   - OpenAPI specification
   - Example requests and responses
   - Error code documentation
