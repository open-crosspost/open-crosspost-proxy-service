# Social Media API Proxy Active Context

## Current Work Focus

The project has successfully migrated from Cloudflare Workers to Deno Deploy, improving
compatibility with the twitter-api-v2 library. We've implemented a platform-agnostic architecture
that makes it easier to adapt the service for other social media platforms beyond Twitter. The core
infrastructure, authentication system, API endpoints, and middleware have been implemented and are
now running on Deno Deploy.

## Recent Changes

- **Completed migration from Cloudflare Workers to Deno Deploy**
- Switched from itty-router to Hono for HTTP routing
- Replaced Cloudflare KV with Deno KV for token storage
- Updated dependencies to use Deno-compatible imports
- Implemented NEAR wallet signature-based authentication
- Created platform abstraction interfaces (PlatformClient, PlatformAuth, PlatformPost,
  PlatformMedia, PlatformProfile)
- Developed Twitter-specific implementations of these interfaces
- Implemented domain services that use the platform abstraction layer
- Created all controllers (AuthController, MediaController, RateLimitController, PostController)
- Implemented all middleware components (AuthMiddleware, CorsMiddleware, ErrorMiddleware,
  RateLimitMiddleware)
- Created comprehensive validation schemas with Zod for all request types
- Generated OpenAPI documentation with paths and schemas for all endpoints
- Enhanced token storage with improved encryption
- Implemented thread support in the post interface and implementation
- Added support for listing connected accounts for a NEAR wallet
- Restructured authentication routes to be platform-specific
- Implemented factory pattern in AuthService for platform-specific implementations
- Updated controllers to support platform-specific parameters
- Enhanced OpenAPI documentation to reflect platform-specific routes
- **Enhanced token storage security with versioned encryption**
- **Added token access logging with PII redaction**
- **Implemented secure environment configuration validation**
- **Added NEAR account authorization flow**: Implemented `POST /auth/authorize/near`,
  `DELETE /auth/unauthorize/near`, and `GET /auth/authorize/near/status` endpoints (using standard
  NEAR signature header validation) to manage and check NEAR account authorization status in KV.
  Updated platform login initialization (`/auth/{platform}/login`) to enforce this check.
- **Created PlatformProfile interface and implementation**: Separated profile-related functionality
  from auth classes into dedicated profile interfaces and implementations.
- **Made TokenStorage platform-specific**: Updated TokenStorage to require platform parameter for
  all operations, ensuring proper separation of tokens by platform.
- **Created KV utility classes**: Implemented `KvStore` and `PrefixedKvStore` utility classes for
  standardized KV operations with error handling.
- **Implemented platform error handling**: Created `PlatformError` class and error types for
  standardized error handling across platform implementations.
- **Created base platform classes**: Implemented `BasePlatformClient` and `BasePlatformAuth`
  abstract classes with common functionality for platform implementations.
- **Refactored token refresh and revocation**: Clarified responsibilities between platform client
  (API operations) and platform auth (storage operations).
- **Created KV structure documentation**: Added comprehensive documentation of KV structure and
  patterns used in the application.
- **Refactored classes to use KV utilities**: Updated `TwitterAuth`, `TokenStorage`,
  `TokenAccessLogger`, and `UserProfileStorage` to use the new KV utility classes instead of direct
  KV access.
- **Fixed NEAR authentication in production**: Fixed an issue with the borsher library in the Deno
  Deploy production environment by implementing a fallback mechanism that tries multiple
  serialization approaches to ensure compatibility across both development and production
  environments.

## Active Decisions

1. **Deno Migration**: ✅ COMPLETED
   - ✅ Created compatibility tests for twitter-api-v2 with Deno
   - ✅ Verified compatibility of Twitter API plugins with Deno
   - ✅ Tested Deno KV for token storage
   - ✅ Created a Deno project structure
   - ✅ Migrated token storage to use Deno KV
   - ✅ Converted existing Node.js code to Deno
   - ✅ Updated imports to use Deno's module system
   - ✅ Implemented Hono for HTTP routing (replacing itty-router)
   - ✅ Updated build and deployment process for Deno Deploy

2. **Platform Abstraction**:
   - ✅ Created interfaces for platform-agnostic operations
   - ✅ Implemented Twitter-specific adapters
   - ✅ Designed for easy extension to other platforms
   - ✅ Maintained all existing functionality in the new structure
   - ✅ Created PlatformProfile interface for user profile operations
   - ✅ Implemented TwitterProfile with profile-specific functionality
   - ✅ Created base classes with common functionality
   - ✅ Standardized error handling across platform implementations
   - ✅ Clarified responsibilities between client and auth components

3. **Authentication**:
   - ✅ Implemented OAuth 2.0 flow with PKCE
   - ✅ Created secure token storage in Deno KV
   - ✅ Added token refresh and revocation
   - ✅ Implemented NEAR wallet signature authentication
   - ✅ Added support for multiple accounts per NEAR wallet
   - ✅ Restructured authentication routes to be platform-specific
   - ✅ Implemented factory pattern for platform-specific auth implementations
   - ✅ Implemented NEAR account authorization pre-check for platform logins (using KV)
   - ✅ Made token storage platform-specific for better separation
   - ✅ Standardized KV operations with utility classes
   - ⬜ Enhance security with proper key rotation

4. **API Implementation**:
   - ✅ Implemented post creation and management
   - ✅ Added support for threads
   - ✅ Created media upload handling
   - ✅ Implemented like/unlike functionality
   - ✅ Added reply and quote post support
   - ✅ Implemented rate limit tracking
   - ⬜ Enhance rate limit management with backoff strategies

5. **Testing and Documentation**:
   - ✅ Created OpenAPI documentation (updated NEAR auth/unauth endpoints for header auth)
   - ✅ Implemented request validation with Zod
   - ✅ Created KV structure documentation
   - ⬜ Create comprehensive test suite
   - ✅ Set up CI/CD pipeline for Deno

## Next Steps

1. **Testing Framework**:
   - Create unit tests for core components
   - Implement integration tests for API endpoints
   - Set up end-to-end testing
   - Configure testing in Deno environment
   - Test platform-specific authentication routes

2. **Deployment Pipeline**:
   - ✅ Set up Deno Deploy environment
   - ✅ Configure CI/CD pipeline for Deno
   - ✅ Create staging environment
   - ✅ Prepare for production deployment

3. **Security Enhancements**:
   - ✅ Implemented versioned encryption for tokens
   - ✅ Added token access logging with PII redaction
   - ✅ Created secure environment configuration validation
   - ⬜ Implement proper key rotation for token encryption
   - ⬜ Enhance input validation and sanitization
   - ⬜ Implement circuit breaker pattern
   - ⬜ Add request size limits

4. **Monitoring and Observability**:
   - Set up structured logging
   - Implement metrics collection
   - Configure alerting
   - Create health check endpoints

5. **SDK Development**:
   - Create client SDK for easy integration
   - Generate TypeScript types from OpenAPI specification
   - Implement client-side validation
   - Add examples and documentation

## Current Challenges

1. **Deno Compatibility**: ✅ RESOLVED
   - ✅ Successfully migrated all npm packages to Deno-compatible versions
   - ✅ Implemented compatibility layers where needed
   - ✅ Optimized performance for Deno environment

2. **Storage Solutions**:
   - Deno KV is still in beta/unstable status
   - Limited storage capacity on free tier
   - ✅ Implemented proper encryption for sensitive data
   - ✅ Made token storage platform-specific for better organization

3. **Testing Infrastructure**:
   - Need to set up comprehensive testing framework
   - Mock external dependencies for testing
   - Create test fixtures and helpers

4. **Deployment Strategy**: ✅ COMPLETED
   - ✅ Configured proper environment variables for Deno Deploy
   - ✅ Set up staging and production environments
   - ✅ Implemented rollback capability
   - ✅ Successfully deployed to Deno Deploy

## Current Directory Structure

```
/
  deno.json               # Deno configuration
  deps.ts                 # Central dependencies file
  main.ts                 # Main entry point
  clear-kv.ts             # KV management utility
  /docs
    kv-structure.md       # KV structure documentation
  /src
    /config
      env.ts              # Environment configuration
      index.ts            # Configuration exports
    /controllers
      auth_controller.ts  # Authentication controller
      media_controller.ts # Media upload controller
      post_controller.ts  # Post management controller
      rate_limit_controller.ts # Rate limit controller
    /domain
      /services
        auth.service.ts   # Authentication service
        media.service.ts  # Media service
        post.service.ts   # Post service
        rate-limit.service.ts # Rate limit service
    /infrastructure
      /platform
        /abstract         # Platform abstraction interfaces
          platform-auth.interface.ts
          platform-client.interface.ts
          platform-media.interface.ts
          platform-post.interface.ts
          platform-profile.interface.ts
          platform-error.ts       # Platform error types and handling
          base-platform-auth.ts   # Base auth implementation
          base-platform-client.ts # Base client implementation
        /twitter          # Twitter-specific implementations
          twitter-auth.ts
          twitter-client.ts
          twitter-media.ts
          twitter-post.ts
          twitter-profile.ts
      /security
        /near-auth        # NEAR wallet authentication
          near-auth.service.ts
          near-auth.types.ts
        token-access-logger.ts # Token access logging
      /storage
        token-storage.ts  # Token storage service
        user-profile-storage.ts # User profile storage
    /middleware
      auth_middleware.ts  # Authentication middleware
      cors_middleware.ts  # CORS handling
      error_middleware.ts # Error handling
      errors.ts           # Error definitions
    /openapi
      index.ts            # OpenAPI specification
      /paths              # API path definitions
        auth.paths.ts
        index.ts
        media.paths.ts
        post.paths.ts
        rate-limit.paths.ts
      /schemas            # Schema definitions
        auth.schemas.ts
        common.schemas.ts
        index.ts
        media.schemas.ts
        post.schemas.ts
        rate-limit.schemas.ts
    /types
      index.ts            # Type exports
      post.types.ts       # Post type definitions
      request.types.ts    # Request type definitions
      response.types.ts   # Response type definitions
      user-profile.types.ts # User profile type definitions
    /utils
      account-linking.utils.ts # Account linking utilities
      near-auth.utils.ts  # NEAR authentication utilities
      kv-store.utils.ts   # KV utility classes
```

## Development Environment

- Using Deno for runtime, package management, and development
- Local development using `deno task dev`
- Testing against Twitter API
- TypeScript with strict type checking
- Deno's built-in testing framework (planned)
- Deno KV for storage
- Upstash Redis for caching and rate limiting
