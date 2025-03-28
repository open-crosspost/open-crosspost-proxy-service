# Social Media API Proxy Technical Context

## Technology Stack

### Core Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Compute Platform | Deno Deploy | Edge runtime for JavaScript/TypeScript applications |
| Primary Storage | Deno KV | Built-in key-value storage for tokens and configuration |
| Database | Upstash Redis | External database for structured data storage |
| Secrets Management | Deno Deploy Environment Variables | Secure storage for API credentials |

### Development Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | Latest | Primary development language |
| Deno | Latest | Runtime, package manager, and development environment |
| Deno Deploy | Latest | Deployment platform for Deno applications |
| Deno Test | Latest | Built-in testing framework |
| Deno Lint | Latest | Built-in linting tool |
| Deno Fmt | Latest | Built-in code formatter |

### Dependencies

| Dependency | Purpose |
|------------|---------|
| Hono | HTTP framework for routing |
| twitter-api-v2 | Twitter API communication library |
| @twitter-api-v2/plugin-token-refresher | Token refresh handling for Twitter API |
| @twitter-api-v2/plugin-rate-limit | Rate limit tracking for Twitter API |
| @twitter-api-v2/plugin-cache-redis | Redis-based caching for API requests |
| @upstash/redis | Redis client for caching |
| jose | JWT handling and cryptographic operations |
| zod | Type validation and schema definition |
| openapi3-ts | OpenAPI specification utilities |
| bs58 | Base58 encoding/decoding for NEAR signatures |

## Development Setup

### Prerequisites

1. Deno (latest version)
2. Deno Deploy account
3. Social media platform developer accounts with API credentials

### Local Development Environment

```bash
# No explicit dependency installation needed with Deno

# Start local development server
deno task dev

# Run tests
deno task test

# Format code
deno task fmt

# Lint code
deno task lint

# Cache dependencies
deno task cache
```

### Environment Configuration

The project uses the following environment variables, which should be configured in Deno Deploy:

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
| UPSTASH_REDIS_REST_URL | Upstash Redis REST URL for caching |
| UPSTASH_REDIS_REST_TOKEN | Upstash Redis REST token for authentication |

## Technical Constraints

### Platform Limitations (Deno Deploy)

1. **Execution Time**: 
   - 10 minute timeout for HTTP requests
   - No timeout for WebSocket connections
2. **Memory Limit**: 
   - 512MB memory limit per instance
   - 128MB limit for response size
3. **CPU Limit**: 
   - CPU time limits based on the plan
4. **Deno KV Limitations**:
   - Currently in beta/unstable status
   - 100MB storage limit on free tier
   - Eventually consistent replication
   - 4KB maximum key size, 64KB maximum value size
5. **npm Compatibility Limitations**:
   - Some npm packages may not work perfectly
   - Node.js built-in modules need compatibility layer
   - Performance impact when using npm packages

### Platform API Constraints

1. **Rate Limits**:
   - Endpoint-specific rate limits
   - App-wide rate limits
   - User-specific rate limits
2. **Media Upload Limitations**:
   - Size limits vary by platform
   - Format requirements vary by platform
   - Some platforms require specific authentication for media uploads
3. **OAuth Constraints**:
   - Token expiration and refresh requirements
   - Scope limitations
   - Platform-specific authentication flows

## Performance Considerations

### Approach

1. **Edge Deployment**:
   - Leverage Deno Deploy's global network for low-latency responses
   - Distributed execution across Deno Deploy's edge network
2. **Caching Strategy**:
   - Upstash Redis for caching API responses
   - Automatic cache invalidation based on rate limit reset times
   - Cache immutable responses
   - Use appropriate cache headers
   - Implement stale-while-revalidate pattern where appropriate
3. **Efficient Token Storage**:
   - Use Deno KV for token storage
   - Implement proper encryption for sensitive data
   - Minimize KV operations with batching where possible
4. **Multi-level Rate Limiting**:
   - Continue using TwitterApiRateLimitPlugin for tracking Twitter rate limits
   - Implement custom rate limiting for the API
   - Use Upstash Redis for distributed rate limit tracking
   - Apply per-endpoint and per-user rate limits
   - Implement backoff strategies
5. **npm Compatibility Optimization**:
   - Use direct Deno imports where possible
   - Minimize npm dependencies to reduce compatibility issues
   - Cache npm dependencies for better performance
   - Monitor performance impact of npm compatibility layer

## Security Considerations

### Approach

1. **Token Security**:
   - Encrypt tokens before storing in Deno KV
   - Use Deno's crypto APIs for encryption
   - Implement proper key rotation
   - Never expose tokens to clients
2. **API Key Management**:
   - Store API keys securely in external database (Upstash Redis)
   - Support key rotation and revocation
   - Implement key scoping for limited permissions
   - Track API key usage
   - Rate limit by API key
   - Validate API keys against allowed origins
3. **CORS Security**:
   - Use Hono's CORS middleware
   - Strict origin validation
   - Proper preflight handling
   - Minimal exposed headers
4. **Input Validation**:
   - Use Zod for validation
   - Generate validation schemas from TypeScript types
   - Sanitize data before passing to platform APIs
   - Implement request size limits
5. **Permissions Model**:
   - Leverage Deno's permissions model for enhanced security
   - Use least privilege principle for file and network access
   - Explicitly declare required permissions

## Monitoring and Observability

### Approach

1. **Logging Strategy**:
   - Structured logging format with Deno's logger
   - Different log levels (error, warn, info, debug)
   - PII redaction in logs
   - Deno Deploy logs integration
   - Potential integration with external logging services
2. **Metrics Collection**:
   - Request counts and latencies via Deno Deploy analytics
   - Custom metrics collection
   - Error rates tracking
   - Rate limit usage monitoring
   - Token refresh operation tracking
   - API key usage analytics
3. **Alerting**:
   - Integration with external alerting services
   - High error rate alerts
   - Rate limit approaching alerts
   - Token refresh failure alerts
   - Unusual traffic pattern alerts

## Deployment Pipeline

### Approach

1. **CI/CD Integration**:
   - GitHub Actions for automated testing and deployment
   - Deno-specific GitHub Actions
   - Environment-specific configurations
   - Direct deployment to Deno Deploy
   - Automated rollbacks on failure
2. **Testing Strategy**:
   - Deno's built-in testing framework
   - Unit tests for core functionality
   - Integration tests for API endpoints
   - Mock platform APIs for testing
   - End-to-end tests in staging environment
3. **Deployment Process**:
   - Git-based deployments
   - Preview deployments for pull requests
   - Staging environment for pre-production testing
   - Production deployment with rollback capability

## API Design

### Approach

1. **Endpoint Structure**:
   - RESTful API design
   - Consistent URL patterns
   - Proper HTTP method usage
   - Hono routing framework
2. **Request/Response Format**:
   - JSON for all responses
   - Consistent error format
   - Proper HTTP status codes
   - Hono Context objects
3. **Authentication**:
   - API key for client authentication
   - NEAR wallet signature for user context
   - OAuth tokens managed by the proxy
   - Hono middleware for authentication
4. **Documentation**:
   - OpenAPI specification
   - Code-first approach using TypeScript types
   - Interactive API documentation
   - Example requests and responses
   - Error code documentation

## Platform Abstraction

### Approach

1. **Interface Design**:
   - Clear interfaces for platform-specific implementations
   - Common operations abstracted across platforms
   - Platform-specific extensions where needed
2. **Adapter Pattern**:
   - Platform-specific adapters implementing common interfaces
   - Factory pattern for creating appropriate platform clients
   - Configuration-driven platform selection
3. **Feature Parity**:
   - Core features supported across all platforms
   - Platform-specific features clearly documented
   - Graceful degradation for unsupported features
