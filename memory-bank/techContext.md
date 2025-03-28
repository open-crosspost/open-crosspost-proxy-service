# Social Media API Proxy Technical Context

## Technology Stack

### Core Infrastructure

#### Current (Being Migrated From)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Compute Platform | Cloudflare Workers | Serverless execution environment for the proxy |
| Primary Storage | Cloudflare KV | Key-value storage for tokens and configuration |
| Database | Cloudflare D1 | SQL database for API key management and complex data storage |
| Secrets Management | Cloudflare Workers Secrets | Secure storage for API credentials |

#### Target (Migrating To)

| Component | Technology | Purpose |
|-----------|------------|---------|
| Compute Platform | Deno Deploy | Edge runtime for JavaScript/TypeScript applications |
| Primary Storage | Deno KV | Built-in key-value storage for tokens and configuration |
| Database | Upstash Redis or PostgreSQL | External database for structured data storage |
| Secrets Management | Deno Deploy Environment Variables | Secure storage for API credentials |

### Development Technologies

#### Current (Being Migrated From)

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | Latest | Primary development language |
| Bun | Latest | Package manager and runtime |
| Wrangler | Latest | Cloudflare Workers CLI tool |
| Jest | Latest | Testing framework |
| ESLint | Latest | Code quality and style enforcement |
| Prettier | Latest | Code formatting |

#### Target (Migrating To)

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | Latest | Primary development language |
| Deno | Latest | Runtime, package manager, and development environment |
| Deno Deploy | Latest | Deployment platform for Deno applications |
| Deno Test | Latest | Built-in testing framework |
| Deno Lint | Latest | Built-in linting tool |
| Deno Fmt | Latest | Built-in code formatter |

### Dependencies

#### Current (Being Migrated From)

| Dependency | Purpose |
|------------|---------|
| twitter-api-v2 | Twitter API communication library |
| @twitter-api-v2/plugin-token-refresher | Token refresh handling for Twitter API |
| @twitter-api-v2/plugin-rate-limit | Rate limit tracking for Twitter API |
| @twitter-api-v2/plugin-cache-redis | Redis-based caching for API requests |
| itty-router | HTTP routing for Cloudflare Workers |
| jose | JWT handling and cryptographic operations |
| redis | Redis client for caching |
| @cloudflare/workers-types | TypeScript definitions for Workers |
| zod | Type validation and schema definition |
| @sinclair/typebox | JSON Schema generation from TypeScript |
| openapi3-ts | OpenAPI specification utilities |

#### Target (Migrating To)

| Dependency | Purpose |
|------------|---------|
| twitter-api-v2 | Twitter API communication library (via npm compatibility) |
| @twitter-api-v2/plugin-token-refresher | Token refresh handling (via npm compatibility) |
| @twitter-api-v2/plugin-rate-limit | Rate limit tracking (via npm compatibility) |
| oak | HTTP framework for Deno (replacing itty-router) |
| jose | JWT handling and cryptographic operations (via npm compatibility) |
| Deno KV | Built-in key-value storage (replacing Cloudflare KV) |
| Upstash Redis SDK | Redis client for caching (replacing @upstash/redis) |
| zod | Type validation and schema definition (via npm compatibility) |
| openapi3-ts | OpenAPI specification utilities (via npm compatibility) |

## Development Setup

### Current Setup (Being Migrated From)

#### Prerequisites

1. Node.js (LTS version) or Bun
2. Cloudflare account with Workers subscription
3. Wrangler CLI installed globally
4. Social media platform developer accounts with API credentials

#### Local Development Environment

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

### Target Setup (Migrating To)

#### Prerequisites

1. Deno (latest version)
2. Deno Deploy account
3. Social media platform developer accounts with API credentials

#### Local Development Environment

```bash
# No explicit dependency installation needed with Deno

# Start local development server
deno run --allow-net --allow-env --allow-read --allow-write --unstable-kv main.ts

# Run tests
deno test

# Format code
deno fmt

# Lint code
deno lint

# Deploy to Deno Deploy
deno deploy
```

### Environment Configuration

#### Current Configuration (Cloudflare Workers)

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
| REDIS_URL | Redis connection URL for caching (optional) |

#### Target Configuration (Deno Deploy)

The project will use the following environment variables, which should be configured in Deno Deploy:

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

### Current Platform Limitations (Cloudflare Workers)

1. **Execution Time**: Workers have a maximum execution time of 30 seconds in the paid tier
2. **Memory Limit**: 128MB memory limit per Worker instance
3. **CPU Limit**: Workers have CPU time limits based on the plan
4. **KV Limitations**:
   - 1MB maximum value size
   - Eventually consistent replication
   - Read-heavy workload optimization
5. **D1 Limitations**:
   - SQLite-based database
   - Limited concurrent writes
   - Size limitations based on plan

### Target Platform Limitations (Deno Deploy)

1. **Execution Time**: 
   - 10 minute timeout for HTTP requests
   - No timeout for WebSocket connections
2. **Memory Limit**: 
   - 512MB memory limit per instance
   - 128MB limit for response size
3. **CPU Limit**: 
   - CPU time limits based on the plan
   - More generous than Cloudflare Workers
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

### Current Approach (Cloudflare Workers)

1. **Edge Deployment**: 
   - Leverage Cloudflare's global network for low-latency responses
   - Distributed execution across Cloudflare's edge network
2. **Caching Strategy**:
   - Redis-based caching for API responses
   - Automatic cache invalidation based on rate limit reset times
   - Cache immutable responses
   - Use appropriate cache headers
   - Implement stale-while-revalidate pattern where appropriate
3. **Efficient Token Storage**:
   - Minimize KV operations
   - Batch updates when possible
4. **Multi-level Rate Limiting**:
   - Track platform-specific rate limits
   - Implement global service rate limits
   - Configure per-API key rate limits
   - Set up per-user rate limits
   - Apply per-endpoint rate limits
   - Implement backoff strategies
   - Queue requests when approaching limits
5. **Media Upload Optimization**:
   - Use chunked uploads for large media
   - Implement proper error handling and retries
   - Monitor processing status for videos

### Target Approach (Deno Deploy)

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

## Migration Strategy

### Phase 1: Compatibility Testing (Completed)

1. **Test Core Dependencies**:
   - Verify twitter-api-v2 compatibility with Deno
   - Test Twitter API plugins in Deno environment
   - Evaluate Deno KV for token storage
   - Create minimal server example with Oak

### Phase 2: Project Structure Setup

1. **Create Deno Project Structure**:
   - Set up deno.json configuration
   - Create deps.ts for centralized dependencies
   - Establish directory structure following Deno conventions
   - Set up module exports with mod.ts files

2. **Environment Configuration**:
   - Set up environment variables for Deno
   - Configure secrets management
   - Create development and production configurations

### Phase 3: Core Components Migration

1. **Storage Layer Migration**:
   - Migrate token storage from Cloudflare KV to Deno KV
   - Implement encryption for sensitive data
   - Create adapters for any D1 database functionality

2. **HTTP Framework Migration**:
   - Replace itty-router with Oak
   - Implement middleware system
   - Set up routing structure
   - Migrate request/response handling

3. **Platform Abstraction Layer**:
   - Migrate Twitter client implementation
   - Update imports to use Deno's module system
   - Ensure all platform interfaces work correctly

### Phase 4: API Implementation

1. **Controller Migration**:
   - Migrate all controllers to Deno
   - Update dependency injection
   - Implement Oak-compatible request handling

2. **Middleware Migration**:
   - Migrate authentication middleware
   - Implement CORS handling
   - Set up error handling
   - Implement rate limiting

3. **Validation Migration**:
   - Update Zod schemas for Deno
   - Migrate validation middleware
   - Ensure type safety across the application

### Phase 5: Testing and Deployment

1. **Test Suite Migration**:
   - Create Deno-compatible tests
   - Implement unit and integration tests
   - Set up end-to-end testing

2. **CI/CD Setup**:
   - Configure GitHub Actions for Deno
   - Set up deployment to Deno Deploy
   - Implement staging and production environments

3. **Monitoring and Observability**:
   - Set up logging for Deno Deploy
   - Implement metrics collection
   - Configure alerting

## Security Considerations

### Current Approach (Cloudflare Workers)

1. **Token Security**:
   - Encrypt tokens before storing in Cloudflare KV
   - Implement proper key rotation
   - Never expose tokens to clients
2. **API Key Management**:
   - Store API keys securely in Cloudflare D1
   - Support key rotation and revocation
   - Implement key scoping for limited permissions
   - Track API key usage
   - Rate limit by API key
   - Validate API keys against allowed origins
3. **CORS Security**:
   - Strict origin validation
   - Proper preflight handling
   - Minimal exposed headers
4. **Input Validation**:
   - Validate all client input with Zod
   - Generate validation schemas from TypeScript types
   - Sanitize data before passing to platform APIs
   - Implement request size limits

### Target Approach (Deno Deploy)

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
   - Use Oak's CORS middleware
   - Strict origin validation
   - Proper preflight handling
   - Minimal exposed headers
4. **Input Validation**:
   - Continue using Zod for validation
   - Generate validation schemas from TypeScript types
   - Sanitize data before passing to platform APIs
   - Implement request size limits
5. **Permissions Model**:
   - Leverage Deno's permissions model for enhanced security
   - Use least privilege principle for file and network access
   - Explicitly declare required permissions

## Monitoring and Observability

### Current Approach (Cloudflare Workers)

1. **Logging Strategy**:
   - Structured logging format
   - Different log levels (error, warn, info, debug)
   - PII redaction in logs
   - Cloudflare Workers logs
2. **Metrics Collection**:
   - Request counts and latencies via Cloudflare Analytics
   - Error rates
   - Rate limit usage
   - Token refresh operations
   - API key usage
3. **Alerting**:
   - High error rate alerts
   - Rate limit approaching alerts
   - Token refresh failure alerts
   - Unusual traffic pattern alerts

### Target Approach (Deno Deploy)

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

### Current Approach (Cloudflare Workers)

1. **CI/CD Integration**:
   - GitHub Actions for automated testing and deployment
   - Environment-specific configurations
   - Wrangler for deployment to Cloudflare Workers
   - Automated rollbacks on failure
2. **Testing Strategy**:
   - Jest for unit tests
   - Integration tests for API endpoints
   - Mock platform APIs for testing
   - End-to-end tests in staging environment

### Target Approach (Deno Deploy)

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

### Current Approach (Cloudflare Workers)

1. **Endpoint Structure**:
   - RESTful API design
   - Consistent URL patterns
   - Proper HTTP method usage
   - Cloudflare Workers routing
2. **Request/Response Format**:
   - JSON for all responses
   - Consistent error format
   - Proper HTTP status codes
   - Cloudflare Workers Request/Response objects
3. **Authentication**:
   - API key for client authentication
   - User ID for user context
   - OAuth tokens managed by the proxy
   - Cloudflare Workers-based middleware
4. **Documentation**:
   - OpenAPI specification
   - Code-first approach using TypeScript types
   - Interactive API documentation
   - Example requests and responses
   - Error code documentation

### Target Approach (Deno Deploy)

1. **Endpoint Structure**:
   - RESTful API design
   - Consistent URL patterns
   - Proper HTTP method usage
   - Oak routing framework
2. **Request/Response Format**:
   - JSON for all responses
   - Consistent error format
   - Proper HTTP status codes
   - Oak Context objects
3. **Authentication**:
   - API key for client authentication
   - User ID for user context
   - OAuth tokens managed by the proxy
   - Oak middleware for authentication
4. **Documentation**:
   - OpenAPI specification
   - Code-first approach using TypeScript types
   - Interactive API documentation
   - Example requests and responses
   - Error code documentation
   - Deno-compatible API documentation

## Migration Conclusion

The migration from Cloudflare Workers to Deno Deploy represents a strategic shift in our infrastructure to overcome compatibility issues with the twitter-api-v2 library while maintaining the core functionality and architecture of the Twitter API Proxy. This migration offers several advantages:

1. **Improved Compatibility**: Deno's npm compatibility layer allows us to use twitter-api-v2 and its plugins, which was not possible in Cloudflare Workers.

2. **Enhanced Developer Experience**: Deno provides a more integrated development experience with built-in TypeScript support, testing, formatting, and linting.

3. **Better Resource Limits**: Deno Deploy offers more generous execution time and memory limits compared to Cloudflare Workers.

4. **Modern Security Model**: Deno's permission-based security model allows for more fine-grained control over what the application can access.

5. **Simplified Dependency Management**: Deno's URL-based imports and centralized deps.ts approach simplifies dependency management.

The migration will be executed in phases, starting with compatibility testing (already completed), followed by project structure setup, core components migration, API implementation, and finally testing and deployment. This phased approach ensures that we can maintain functionality throughout the migration process and address any issues as they arise.

While the migration introduces some challenges, particularly around npm compatibility and storage solutions, our testing has shown that these challenges can be overcome with appropriate adaptations and workarounds. The end result will be a more robust, maintainable, and scalable Twitter API Proxy that can continue to serve our users effectively.

## Platform Abstraction

### Current Approach (Cloudflare Workers)

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

### Target Approach (Deno Deploy)

1. **Interface Design**:
   - Maintain the same interface design principles
   - Update interfaces to use Deno-compatible types
   - Leverage TypeScript's type system for better type safety
   - Maintain clear separation between platform-specific and core functionality
2. **Adapter Pattern**:
   - Continue using the adapter pattern for platform implementations
   - Update adapters to use Deno's module system
   - Ensure compatibility with npm packages through Deno's compatibility layer
   - Maintain factory pattern for creating appropriate platform clients
3. **Feature Parity**:
   - Ensure all features are supported in the Deno implementation
   - Document any platform-specific differences
   - Implement graceful degradation for unsupported features
   - Leverage Deno-specific features where appropriate
