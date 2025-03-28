# Social Media API Proxy Active Context

## Current Work Focus

The project is undergoing a significant reorganization to improve code structure, security, and maintainability. We're implementing a platform-agnostic architecture that will make it easier to adapt the service for other social media platforms beyond Twitter. We've recently completed the implementation of all controllers, middleware, validation schemas, and OpenAPI documentation.

Additionally, we're now planning to migrate the entire application from Cloudflare Workers to Deno Deploy, as we've discovered compatibility issues with the node-twitter-api-v2 library in Cloudflare Workers. Initial compatibility tests with Deno have shown promising results.

## Recent Changes

- Implemented platform abstraction interfaces (PlatformClient, PlatformAuth, PlatformPost, PlatformMedia)
- Created Twitter-specific implementations of these interfaces
- Developed domain services that use the platform abstraction layer
- Implemented API key management with model, service, and storage
- Created all controllers (AuthController, MediaController, RateLimitController, ApiKeyController, PostController)
- Implemented all middleware components (AuthMiddleware, CorsMiddleware, ErrorMiddleware, RateLimitMiddleware)
- Created comprehensive validation schemas with Zod for all request types
- Generated OpenAPI documentation with paths and schemas for all endpoints
- Enhanced token storage with improved encryption
- Implemented thread support in the post interface and implementation
- Added NEAR wallet signature-based authentication
- Implemented platform-specific posting with NEAR wallet signatures
- Added support for listing connected accounts for a NEAR wallet

## Active Decisions

1. **Project Reorganization**:
   - ✅ Implemented a domain-driven directory structure
   - ✅ Created a clear separation between platform-specific code and core functionality
   - ✅ Using consistent naming conventions (all lowercase with hyphens for files)
   - ✅ Renamed abstract services to be "post" rather than "tweet" to make them platform-agnostic

2. **API Key Management**:
   - ✅ Implemented a custom API key management solution with Cloudflare D1
   - ✅ Supporting key rotation, revocation, and scoping
   - ✅ Added tracking for API key usage
   - ✅ Created API key controller with endpoints for management

3. **Platform Abstraction**:
   - ✅ Created interfaces for platform-agnostic operations
   - ✅ Implemented Twitter-specific adapters
   - ✅ Designed for easy extension to other platforms
   - ✅ Maintained all existing functionality in the new structure

4. **Thread Support**:
   - ✅ Added support for creating threads
   - ✅ Implemented thread support for quote tweets and replies
   - ✅ Enhanced the post interface to handle arrays of content

5. **Media Handling**:
   - ✅ Implemented platform-agnostic media interface
   - ✅ Created Twitter-specific media implementation
   - ✅ Added support for chunked uploads and media metadata
   - ✅ Implemented media controller for upload, status, and metadata operations

6. **Validation and Documentation**:
   - ✅ Implemented comprehensive Zod schemas for request validation
   - ✅ Created OpenAPI documentation for all endpoints
   - ✅ Defined schema definitions for all request and response types
   - ✅ Organized documentation by domain area

7. **Deno Migration Plan**:
   - ✅ Created compatibility tests for twitter-api-v2 with Deno
   - ✅ Verified compatibility of Twitter API plugins with Deno
   - ✅ Tested Deno KV for token storage
   - ✅ Created a minimal Deno server example
   - ⬜ Migrate token storage to use Deno KV
   - ⬜ Convert existing Node.js code to Deno
   - ⬜ Update build and deployment process for Deno Deploy

## Next Steps

1. **Code Organization and Refactoring**:
   - ✅ Extract common NEAR authentication logic to utilities
   - ⬜ Refactor controllers to use utility functions
   - ⬜ Create additional utility functions for common operations
   - ⬜ Implement proper error handling for NEAR authentication
   - ⬜ Update account linking during OAuth callback

2. **Migrate to Deno**:
   - Create a proper Deno project structure
   - Migrate token storage to use Deno KV
   - Convert existing Node.js code to Deno
   - Update imports to use Deno's module system
   - Implement Oak for HTTP routing (replacing itty-router)
   - Update build and deployment process for Deno Deploy

3. **Update Main Entry Point**:
   - Create a new Deno-compatible entry point
   - Connect all routes to the appropriate controller methods
   - Implement middleware chains for each route

4. **Create SDK**:
   - Implement platform-agnostic SDK
   - Generate TypeScript types from OpenAPI specification
   - Create client-side validation

4. **Testing**:
   - Create Deno-compatible tests
   - Implement unit tests for all components
   - Set up integration tests for API endpoints
   - Configure testing in Deno environment

5. **Deployment**:
   - Set up Deno Deploy environment
   - Configure CI/CD pipeline for Deno
   - Prepare for production deployment

## Current Challenges

1. **Deno Migration**:
   - Adapting to Deno's module system and import syntax
   - Replacing Cloudflare-specific services (KV, D1) with Deno alternatives
   - Ensuring all npm dependencies are compatible with Deno
   - Handling TypeScript differences between Node.js and Deno

2. **Maintaining Backward Compatibility**:
   - Ensuring the new structure works with existing clients
   - Preserving all current functionality during the transition
   - Handling edge cases in the platform abstraction

3. **Storage Solutions**:
   - Migrating from Cloudflare KV to Deno KV for token storage
   - Finding alternatives to Cloudflare D1 for structured data
   - Implementing proper encryption in the new environment

4. **Deployment Strategy**:
   - Planning the transition from Cloudflare Workers to Deno Deploy
   - Setting up staging environment in Deno Deploy
   - Configuring CI/CD pipeline for Deno

## Current Directory Structure

```
/src
  /api
    /controllers           # Request handlers
      post.controller.ts
      auth.controller.ts
      media.controller.ts
      rate-limit.controller.ts
    /middleware
      auth.middleware.ts
      cors.middleware.ts
      error.middleware.ts
      rate-limit.middleware.ts
    /validation
      auth.validation.ts
      post.validation.ts
      media.validation.ts
      rate-limit.validation.ts
    /openapi               # OpenAPI specification
      index.ts
      paths/
        index.ts
        auth.paths.ts
        post.paths.ts
        media.paths.ts
        rate-limit.paths.ts
      schemas/
        index.ts
        common.schemas.ts
        auth.schemas.ts
        post.schemas.ts
        media.schemas.ts
        rate-limit.schemas.ts
  /domain
    /services              # Business logic
      auth.service.ts
      post.service.ts
      media.service.ts
      rate-limit.service.ts
    /models                # Domain models and types
      auth.model.ts (pending)
      post.model.ts (pending)
      media.model.ts (pending)
  /infrastructure
    /platform              # Platform-specific implementations
      /twitter             # Twitter-specific code
        twitter-client.ts
        twitter-auth.ts
        twitter-media.ts
        twitter-post.ts
      /abstract            # Abstract interfaces for platform implementations
        platform-client.interface.ts
        platform-auth.interface.ts
        platform-media.interface.ts
        platform-post.interface.ts
    /security
      /encryption
        encryption.service.ts (pending)
    /storage
      token-storage.ts
    /cache
      redis-cache.ts (pending)
  /utils
    error.utils.ts (pending)
    response.utils.ts (pending)
    validation.utils.ts (pending)
  /types
    index.ts
    request.types.ts
    response.types.ts
  /config
    index.ts
    env.ts
  index.ts (needs update)
/sdk
  index.ts (pending)
  social-proxy-sdk.ts (pending)
  types.ts (pending)
```

## Planned Deno Project Structure

```
/
  deno.json               # Deno configuration
  deps.ts                 # Central dependencies file
  main.ts                 # Main entry point
  /routes
    mod.ts                # Routes module
    auth.routes.ts
    post.routes.ts
    media.routes.ts
    rate_limit.routes.ts
  /api
    /controllers          # Request handlers
      mod.ts
      post.controller.ts
      auth.controller.ts
      media.controller.ts
      rate_limit.controller.ts
    /middleware
      mod.ts
      auth.middleware.ts
      cors.middleware.ts
      error.middleware.ts
      rate_limit.middleware.ts
    /validation
      mod.ts
      auth.validation.ts
      post.validation.ts
      media.validation.ts
      rate_limit.validation.ts
    /openapi              # OpenAPI specification
      mod.ts
      paths/
        mod.ts
        auth.paths.ts
        post.paths.ts
        media.paths.ts
        rate_limit.paths.ts
      schemas/
        mod.ts
        common.schemas.ts
        auth.schemas.ts
        post.schemas.ts
        media.schemas.ts
        rate_limit.schemas.ts
  /domain
    /services             # Business logic
      mod.ts
      auth.service.ts
      post.service.ts
      media.service.ts
      rate_limit.service.ts
    /models               # Domain models and types
      mod.ts
      auth.model.ts
      post.model.ts
      media.model.ts
  /infrastructure
    /platform             # Platform-specific implementations
      /twitter            # Twitter-specific code
        mod.ts
        twitter_client.ts
        twitter_auth.ts
        twitter_media.ts
        twitter_post.ts
      /abstract           # Abstract interfaces for platform implementations
        mod.ts
        platform_client.interface.ts
        platform_auth.interface.ts
        platform_media.interface.ts
        platform_post.interface.ts
    /security
      /encryption
        mod.ts
        encryption.service.ts
    /storage
      mod.ts
      token_storage.ts
    /cache
      mod.ts
      redis_cache.ts
  /utils
    mod.ts
    error.utils.ts
    response.utils.ts
    validation.utils.ts
  /types
    mod.ts
    request.types.ts
    response.types.ts
  /config
    mod.ts
    env.ts
/sdk
  mod.ts
  social_proxy_sdk.ts
  types.ts
/tests
  /unit
  /integration
  /e2e
```

## Current Development Environment

- Using Bun for package management and running scripts (transitioning to Deno)
- Local development using Wrangler for Workers simulation (transitioning to Deno)
- Testing against Twitter API
- TypeScript with strict type checking
- Jest for unit and integration testing (will transition to Deno testing framework)
- Created Deno compatibility tests for core functionality
- Exploring Deno KV for storage solutions
- Planning to use Oak framework for HTTP routing in Deno
