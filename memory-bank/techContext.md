# Social Media API Proxy Technical Context

## Technology Stack

### Core Infrastructure

| Component          | Technology                        | Purpose                                                 |
| ------------------ | --------------------------------- | ------------------------------------------------------- |
| Compute Platform   | Deno Deploy                       | Edge runtime for JavaScript/TypeScript applications     |
| Primary Storage    | Deno KV                           | Built-in key-value storage for tokens and configuration |
| Secrets Management | Deno Deploy Environment Variables | Secure storage for API credentials                      |

### Development Technologies

| Technology  | Version | Purpose                                               |
| ----------- | ------- | ----------------------------------------------------- |
| TypeScript  | Latest  | Primary development language                          |
| Deno        | Latest  | Runtime, package manager, and development environment |
| Deno Deploy | Latest  | Deployment platform for Deno applications             |
| Deno Test   | Latest  | Built-in testing framework                            |
| Deno Lint   | Latest  | Built-in linting tool                                 |
| Deno Fmt    | Latest  | Built-in code formatter                               |

### Dependencies

| Dependency                             | Purpose                                      |
| -------------------------------------- | -------------------------------------------- |
| Hono                                   | HTTP framework for routing                   |
| twitter-api-v2                         | Twitter API communication library            |
| @twitter-api-v2/plugin-token-refresher | Token refresh handling for Twitter API       |
| @twitter-api-v2/plugin-rate-limit      | Rate limit tracking for Twitter API          |
| jose                                   | JWT handling and cryptographic operations    |
| zod                                    | Type validation and schema definition        |
| bs58                                   | Base58 encoding/decoding for NEAR signatures |
| @std/testing/bdd                       | BDD-style testing with describe/it functions |
| @std/assert                            | Assertion library for testing                |
| @std/expect                            | Jest-like expect assertions for testing      |
| @std/testing/snapshot                  | Snapshot testing capabilities                |

## Development Setup

### Prerequisites

1. Deno (latest version)
2. Social media platform developer accounts with API credentials

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

| Variable              | Purpose                                                    |
| --------------------- | ---------------------------------------------------------- |
| TWITTER_CLIENT_ID     | Twitter OAuth client ID                                    |
| TWITTER_CLIENT_SECRET | Twitter OAuth client secret                                |
| TWITTER_API_KEY       | Twitter API key (for OAuth 1.0a)                           |
| TWITTER_API_SECRET    | Twitter API secret (for OAuth 1.0a)                        |
| TWITTER_ACCESS_TOKEN  | Twitter access token (for OAuth 1.0a)                      |
| TWITTER_ACCESS_SECRET | Twitter access secret (for OAuth 1.0a)                     |
| ENCRYPTION_KEY        | Key for encrypting stored tokens                           |
| ALLOWED_ORIGINS       | Comma-separated list of allowed CORS origins               |
| API_KEYS              | JSON string of valid API keys and their associated origins |
| ENVIRONMENT           | Current environment (development, staging, production)     |

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
2. **Efficient Token Storage**:
   - Use Deno KV for token storage
   - Implement proper encryption for sensitive data
   - Minimize KV operations with batching where possible
3. **Multi-level Rate Limiting**:
   - Use TwitterApiRateLimitPlugin for tracking Twitter rate limits
   - Implement custom rate limiting for the API
   - Apply per-endpoint and per-user rate limits
   - Implement backoff strategies

## Security Considerations

### Approach

1. **Token Security**:
   - Encrypt tokens before storing in Deno KV
   - Use Deno's crypto APIs for encryption with AES-GCM
   - Implement versioned encryption for future key rotation
   - Comprehensive token access logging with PII redaction
   - Secure environment configuration validation
   - Never expose tokens to clients
2. **API Key Management**:
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
