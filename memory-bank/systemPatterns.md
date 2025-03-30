# Social Media API Proxy System Patterns

## System Architecture

The Social Media API Proxy follows a serverless architecture pattern using Deno Deploy as the
compute platform. This architecture provides global distribution, high availability, and automatic
scaling without managing traditional server infrastructure. The system is designed to be
platform-agnostic, with Twitter as the initial implementation.

```mermaid
flowchart TD
    Client[Client Application] <--> Worker[Deno Deploy]
    Worker <--> Platform[Social Media Platform APIs]
    Worker <--> KV[Deno KV]
    Worker <--> Redis[Upstash Redis]
    
    subgraph "Deno Deploy Edge Network"
        Worker
        KV
    end
    
    subgraph "External Services"
        Platform
        Redis
    end
```

## Core Design Patterns

### 1. Platform Abstraction Pattern

The system implements a platform abstraction layer that separates the core proxy functionality from
platform-specific implementations. This allows for easy extension to other social media platforms.

```mermaid
flowchart TD
    Client[Client] --> API[API Layer]
    API --> Domain[Domain Services]
    Domain --> Abstraction[Platform Abstraction]
    Abstraction --> Twitter[Twitter Implementation]
    Abstraction --> LinkedIn[LinkedIn Implementation]
    Abstraction --> Other[Other Platforms...]
```

### 2. API Gateway Pattern

The Worker acts as an API Gateway, providing a unified interface to various social media APIs while
handling cross-cutting concerns like authentication, rate limiting, and logging.

```mermaid
flowchart LR
    Client[Client] --> Gateway[API Gateway]
    Gateway --> Auth[Authentication]
    Gateway --> Rate[Rate Limiting]
    Gateway --> Log[Logging]
    Gateway --> Platform[Platform APIs]
```

### 3. Authentication Patterns

#### 3.1 Platform-Specific OAuth Proxy Pattern

The system implements a platform-specific OAuth Proxy pattern, handling the complete OAuth flow with
social media platforms through platform-specific routes while providing a simplified authentication
interface to clients.

```mermaid
sequenceDiagram
    participant Client
    participant Client
    participant Proxy
    participant Platform
    
    Client->>Proxy: Request Auth URL (platform-specific, with NEAR signature)
    Proxy->>Proxy: Validate NEAR Signature
    Proxy->>KV: Check NEAR Account Authorization Status
    alt NEAR Account Authorized
        Proxy->>Client: Return Auth URL
        Client->>Platform: Redirect to Auth URL
        Platform->>Proxy: Callback to platform-specific endpoint
    else NEAR Account Not Authorized
        Proxy->>Client: Return 403 Error (Authorization Required)
    end
    Proxy->>Platform: Exchange Code for Tokens
    Platform->>Proxy: Return Tokens
    Proxy->>KV: Store Tokens
    Proxy->>Client: Return Success (Redirect to Client Success URL)
```

The platform-specific routes follow this pattern:

- `/auth/{platform}/login` - Initialize authentication for a specific platform
- `/auth/{platform}/callback` - Handle callback from a specific platform
- `/auth/{platform}/refresh` - Refresh tokens for a specific platform
- `/auth/{platform}/revoke` - Revoke tokens for a specific platform
- `/auth/{platform}/status` - Check token status for a specific platform

This approach:

- Makes the platform explicit in the URL
- Allows for platform-specific implementations
- Maintains a consistent pattern
- Simplifies routing logic
- Makes it easier to add new platforms

#### 3.2 NEAR Wallet Signature Authentication Pattern

The system supports authentication using NEAR wallet signatures, allowing users to authenticate and
authorize actions using their NEAR wallet.

```mermaid
sequenceDiagram
    participant Client
    participant NEAR Wallet
    participant Proxy
    participant Platform
    
    Client->>NEAR Wallet: Request Signature
    NEAR Wallet->>Client: Return Signed Message
    Client->>Proxy: Send Signature + Request
    Proxy->>Proxy: Validate Signature
    Proxy->>Proxy: Check Account Authorization (KV Check)
    alt Authorized
      Proxy->>Platform: Execute Action with Stored Token
      Platform->>Proxy: Return Result
    else Not Authorized
      Proxy->>Client: Return 403 Error
    end
    Proxy->>Client: Return Result
```

This pattern enables:

- Secure authentication without exposing OAuth tokens to the client
- Multiple platform accounts linked to a single NEAR wallet
- Cross-platform actions authorized by a single signature
- Decentralized identity management

### 4. API Key Management Pattern

A dedicated API Key Management system handles the creation, validation, rotation, and revocation of
API keys for client applications.

```mermaid
flowchart TD
    Request[API Request] --> ExtractKey[Extract API Key]
    ExtractKey --> ValidateKey[Validate API Key]
    ValidateKey --> CheckValid{Valid Key?}
    CheckValid -->|No| RejectRequest[Reject Request]
    CheckValid -->|Yes| CheckScope{Has Required Scope?}
    CheckScope -->|No| RejectRequest
    CheckScope -->|Yes| TrackUsage[Track Key Usage]
    TrackUsage --> ProcessRequest[Process Request]
    
    Admin[Admin Request] --> KeyManagement[API Key Management]
    KeyManagement --> CreateKey[Create Key]
    KeyManagement --> RevokeKey[Revoke Key]
    KeyManagement --> RotateKey[Rotate Key]
    KeyManagement --> ListKeys[List Keys]
```

### 5. Circuit Breaker Pattern

To handle potential API outages or rate limiting, the system implements a Circuit Breaker pattern to
prevent cascading failures.

```mermaid
stateDiagram-v2
    [*] --> Closed
    Closed --> Open: Failure Threshold Exceeded
    Open --> HalfOpen: Timeout Period Elapsed
    HalfOpen --> Closed: Success
    HalfOpen --> Open: Failure
```

### 6. Token Manager Pattern

A dedicated Token Manager handles secure storage, retrieval, and refresh of OAuth tokens.

```mermaid
flowchart TD
    Request[API Request] --> TokenManager[Token Manager]
    TokenManager --> KV[KV Storage]
    TokenManager --> Valid{Token Valid?}
    Valid -->|Yes| UseToken[Use Token]
    Valid -->|No| Refresh[Refresh Token]
    Refresh --> Platform[Platform API]
    Platform --> UpdateToken[Update Token in KV]
    UpdateToken --> UseToken
```

### 7. Multi-level Rate Limit Pattern

A comprehensive Rate Limit Manager tracks and enforces rate limits at multiple levels: platform API
limits, global service limits, per-API key limits, and per-user limits.

```mermaid
flowchart TD
    Request[API Request] --> GlobalLimit[Check Global Limits]
    GlobalLimit --> KeyLimit[Check API Key Limits]
    KeyLimit --> UserLimit[Check User Limits]
    UserLimit --> EndpointLimit[Check Endpoint Limits]
    EndpointLimit --> PlatformLimit[Check Platform API Limits]
    
    PlatformLimit --> Allowed{Allowed?}
    Allowed -->|Yes| CacheCheck{Cache Hit?}
    Allowed -->|No| QueueOrReject[Queue or Reject]
    
    CacheCheck -->|Yes| ServeFromCache[Serve Cached Response]
    CacheCheck -->|No| ProcessRequest[Process Request]
    
    ProcessRequest --> UpdateLimits[Update Rate Limit Counters]
    ProcessRequest --> CacheResponse[Cache Response]
    
    ServeFromCache --> ReturnResponse[Return Response]
    CacheResponse --> ReturnResponse
```

### 8. Cache-Aside Pattern

The system implements a Cache-Aside pattern using Redis for caching API responses, reducing
duplicate API calls and improving performance.

```mermaid
flowchart TD
    Request[API Request] --> CheckCache[Check Cache]
    CheckCache --> CacheHit{Cache Hit?}
    
    CacheHit -->|Yes| ServeCache[Serve from Cache]
    CacheHit -->|No| CallAPI[Call Platform API]
    
    CallAPI --> StoreCache[Store in Cache]
    StoreCache --> SetExpiry[Set Expiry Based on Rate Limit]
    SetExpiry --> ServeResponse[Serve API Response]
    
    ServeCache --> ReturnResponse[Return Response]
    ServeResponse --> ReturnResponse
```

### 9. OpenAPI Documentation Pattern

The system generates and serves OpenAPI documentation for all endpoints, providing a
self-documenting API.

```mermaid
flowchart TD
    CodeFirst[Code-First Approach] --> TypeDefinitions[Type Definitions]
    TypeDefinitions --> SchemaGeneration[Schema Generation]
    SchemaGeneration --> OpenAPISpec[OpenAPI Specification]
    
    OpenAPISpec --> Documentation[API Documentation]
    OpenAPISpec --> ClientGeneration[Client SDK Generation]
    OpenAPISpec --> Validation[Request/Response Validation]
```

## Component Relationships

### Core Components

```mermaid
classDiagram
    class Router {
        +route(request)
    }
    
    class AuthController {
        +initializeAuth(c, platform)
        +handleCallback(c, platform)
        +refreshToken(c, platform)
        +revokeToken(c, platform)
        +hasValidTokens(c, platform)
        +listConnectedAccounts(c)
    }
    
    class PostController {
        +createPost()
        +repost()
        +quotePost()
        +deletePost()
        +likePost()
        +unlikePost()
        +replyToPost()
    }
    
    class MediaController {
        +uploadMedia()
        +getMediaStatus()
        +updateMediaMetadata()
    }
    
    class RateLimitController {
        +getRateLimitStatus()
        +getAllRateLimits()
    }
    
    class AuthService {
        +platformAuthMap: Map<string, PlatformAuth>
        +getPlatformAuth(platform)
        +initializeAuth(platform, signerId, redirectUri, scopes, successUrl, errorUrl)
        +handleCallback(platform, code, state)
        +refreshToken(platform, userId)
        +revokeToken(platform, userId)
        +hasValidTokens(platform, userId)
        +listConnectedAccounts()
    }
    
    class PostService {
        +createPost()
        +repost()
        +quotePost()
        +deletePost()
        +replyToPost()
        +likePost()
        +unlikePost()
    }
    
    class MediaService {
        +uploadMedia()
        +getMediaStatus()
        +updateMediaMetadata()
    }
    
    class RateLimitService {
        +getRateLimitStatus()
        +getAllRateLimits()
        +checkRateLimit()
        +updateRateLimitCounters()
    }
    
    class PlatformClient {
        <<interface>>
        +initialize()
        +getClientForUser()
        +getAuthUrl()
        +exchangeCodeForToken()
        +refreshToken()
        +revokeToken()
        +getRateLimitStatus()
    }
    
    class PlatformAuth {
        <<interface>>
        +initializeAuth()
        +handleCallback()
        +refreshToken()
        +revokeToken()
        +hasValidTokens()
        +listConnectedAccounts()
    }
    
    class PlatformPost {
        <<interface>>
        +createPost()
        +repost()
        +quotePost()
        +deletePost()
        +replyToPost()
        +likePost()
        +unlikePost()
    }
    
    class PlatformMedia {
        <<interface>>
        +uploadMedia()
        +getMediaStatus()
        +updateMediaMetadata()
    }
    
    class TwitterClient {
        +initialize()
        +getClientForUser()
        +getAuthUrl()
        +exchangeCodeForToken()
        +refreshToken()
        +revokeToken()
        +getRateLimitStatus()
    }
    
    class TwitterAuth {
        +initializeAuth()
        +handleCallback()
        +refreshToken()
        +revokeToken()
        +hasValidTokens()
        +listConnectedAccounts()
    }
    
    class TwitterPost {
        +createPost()
        +repost()
        +quotePost()
        +deletePost()
        +replyToPost()
        +likePost()
        +unlikePost()
    }
    
    class TwitterMedia {
        +uploadMedia()
        +getMediaStatus()
        +updateMediaMetadata()
    }
    
    class TokenStorage {
        +getTokens()
        +saveTokens()
        +deleteTokens()
        +hasTokens()
        +listTokens()
    }
    
    class AuthMiddleware {
        +validateApiKey()
        +validateNearSignature()
    }
    
    class CorsMiddleware {
        +handleCors()
        +addCorsHeaders()
    }
    
    class ErrorMiddleware {
        +handleErrors()
    }
    
    class RateLimitMiddleware {
        +checkRateLimits()
        +updateRateLimitCounters()
    }
    
    Router --> AuthController
    Router --> PostController
    Router --> MediaController
    Router --> RateLimitController
    
    AuthController --> AuthService
    PostController --> PostService
    MediaController --> MediaService
    RateLimitController --> RateLimitService
    
    AuthService --> PlatformAuth
    PostService --> PlatformPost
    MediaService --> PlatformMedia
    
    PlatformAuth <|-- TwitterAuth
    PlatformPost <|-- TwitterPost
    PlatformMedia <|-- TwitterMedia
    PlatformClient <|-- TwitterClient
    
    TwitterAuth --> TwitterClient
    TwitterPost --> TwitterClient
    TwitterMedia --> TwitterClient
    
    AuthService --> TokenStorage
    
    Router --> AuthMiddleware
    Router --> CorsMiddleware
    Router --> ErrorMiddleware
    Router --> RateLimitMiddleware
```

## Data Flow Patterns

### NEAR Account Authorization/Unauthorization Flow

```mermaid
flowchart TD
    subgraph Authorize
        ReqAuth[POST /auth/authorize/near Request] --> ParseAuth[Parse NEAR Auth Data]
        ParseAuth --> ValidateSigAuth[Validate Signature]
        ValidateSigAuth --> StoreAuth[Store Authorization in KV]
        StoreAuth --> SuccessAuth[Return Success (200)]
        ValidateSigAuth -- Invalid --> ErrorAuth[Return Error (400/500)]
        StoreAuth -- Error --> ErrorAuth
    end

    subgraph Unauthorize
        ReqUnauth[DELETE /auth/unauthorize/near Request] --> ParseUnauth[Parse NEAR Auth Data]
        ParseUnauth --> ValidateSigUnauth[Validate Signature]
        ValidateSigUnauth --> DeleteAuth[Delete Authorization from KV]
        DeleteAuth --> SuccessUnauth[Return Success (200)]
        ValidateSigUnauth -- Invalid --> ErrorUnauth[Return Error (400/500)]
        DeleteAuth -- Error --> ErrorUnauth
    end
```

### Platform Authentication Flow (Initiation)

```mermaid
flowchart TD
    Start[POST /auth/{platform}/login Request] --> ValidateNearSig[Validate NEAR Signature]
    ValidateNearSig --> CheckNearAuth{NEAR Account Authorized?}
    CheckNearAuth -- Yes --> SelectPlatform[Select Platform]
    CheckNearAuth -- No --> Return403[Return 403 Error]

    SelectPlatform --> GenerateState[Generate State]
    GenerateState --> StoreState[Store State in KV (with Success/Error URLs)]
    StoreState --> BuildURL[Build Platform-Specific Auth URL]
    BuildURL --> ReturnURL[Return Auth URL to Client]

    Callback[GET /auth/{platform}/callback] --> ValidateState[Validate State from KV]
    ValidateState --> ExchangeCode[Exchange Code for Tokens]
    ExchangeCode --> StoreTokens[Store Tokens in KV]
    StoreTokens --> LinkAccount[Link Platform Account to NEAR Account]
    LinkAccount --> RetrieveSuccessURL[Retrieve Success URL from State]
    RetrieveSuccessURL --> RedirectClient[Redirect Client to Success URL]
```

### Post Creation Flow

```mermaid
flowchart TD
    Start[API Request] --> ValidateSignature[Validate NEAR Signature]
    ValidateSignature --> ExtractAccount[Extract NEAR Account]
    ExtractAccount --> GetTokens[Retrieve Tokens]
    GetTokens --> CheckTokens{Tokens Valid?}
    CheckTokens -->|No| RefreshToken[Refresh Token]
    CheckTokens -->|Yes| ProcessMedia{Has Media?}
    RefreshToken --> ProcessMedia
    
    ProcessMedia -->|Yes| UploadMedia[Upload Media]
    ProcessMedia -->|No| CreatePost[Create Post]
    UploadMedia --> CreatePost
    
    CreatePost --> HandleResponse[Handle Response]
    HandleResponse --> ReturnResponse[Return Response]
```

### Thread Creation Flow

```mermaid
flowchart TD
    Start[API Request] --> ValidateSignature[Validate NEAR Signature]
    ValidateSignature --> ExtractAccount[Extract NEAR Account]
    ExtractAccount --> GetTokens[Retrieve Tokens]
    GetTokens --> ParseBody[Parse Request Body]
    ParseBody --> IsThread{Is Thread?}
    
    IsThread -->|Yes| ProcessThread[Process Thread Content]
    IsThread -->|No| ProcessSinglePost[Process Single Post]
    
    ProcessThread --> ProcessMedia[Process Media for Each Post]
    ProcessSinglePost --> ProcessMedia
    
    ProcessMedia --> CreateThread{Is Thread?}
    CreateThread -->|Yes| PostThread[Post Thread]
    CreateThread -->|No| PostSingle[Post Single Post]
    
    PostThread --> ReturnResponse[Return Response]
    PostSingle --> ReturnResponse
```

### Media Upload Flow

```mermaid
flowchart TD
    Start[Media Upload] --> ValidateMedia[Validate Media]
    ValidateMedia --> CheckSize{Large File?}
    
    CheckSize -->|Yes| InitChunked[Initialize Chunked Upload]
    CheckSize -->|No| SimpleUpload[Simple Upload]
    
    InitChunked --> UploadChunks[Upload Chunks]
    UploadChunks --> FinalizeUpload[Finalize Upload]
    
    SimpleUpload --> CheckType{Is Video?}
    FinalizeUpload --> CheckType
    
    CheckType -->|Yes| WaitProcessing[Wait for Processing]
    CheckType -->|No| ReturnMediaId[Return Media ID]
    
    WaitProcessing --> ReturnMediaId
```

## Error Handling Patterns

```mermaid
flowchart TD
    Error[Error Occurs] --> Classify{Classify Error}
    Classify -->|Auth Error| HandleAuth[Handle Auth Error]
    Classify -->|Rate Limit| HandleRate[Handle Rate Limit]
    Classify -->|Platform API| HandlePlatform[Handle Platform Error]
    Classify -->|Validation| HandleValidation[Handle Validation Error]
    Classify -->|Internal| HandleInternal[Handle Internal Error]
    
    HandleAuth --> RefreshOrRevoke[Refresh or Revoke Token]
    HandleRate --> Backoff[Apply Backoff Strategy]
    HandlePlatform --> RetryOrFail[Retry or Fail Gracefully]
    HandleValidation --> ReturnDetails[Return Validation Details]
    HandleInternal --> LogAndAlert[Log and Alert]
    
    RefreshOrRevoke --> ReturnError[Return Error Response]
    Backoff --> ReturnError
    RetryOrFail --> ReturnError
    ReturnDetails --> ReturnError
    LogAndAlert --> ReturnError
```

## Deployment Patterns

```mermaid
flowchart TD
    Code[Code Changes] --> CI[CI Pipeline]
    CI --> Lint[Lint and Format]
    Lint --> Tests[Run Tests]
    Tests --> Build[Build]
    Build --> DeployStaging[Deploy to Staging]
    DeployStaging --> StagingTests[Run Staging Tests]
    StagingTests --> DeployProd[Deploy to Production]
```
