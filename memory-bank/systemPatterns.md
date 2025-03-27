# Twitter API Proxy System Patterns

## System Architecture

The Twitter API Proxy follows a serverless architecture pattern using Cloudflare Workers as the compute platform. This architecture provides global distribution, high availability, and automatic scaling without managing traditional server infrastructure.

```mermaid
flowchart TD
    Client[Client Application] <--> Worker[Cloudflare Worker]
    Worker <--> Twitter[Twitter API]
    Worker <--> KV[Cloudflare KV]
    Worker <--> D1[Cloudflare D1]
    
    subgraph "Cloudflare Edge Network"
        Worker
        KV
        D1
    end
```

## Core Design Patterns

### 1. API Gateway Pattern

The Worker acts as an API Gateway, providing a unified interface to the Twitter API while handling cross-cutting concerns like authentication, rate limiting, and logging.

```mermaid
flowchart LR
    Client[Client] --> Gateway[API Gateway]
    Gateway --> Auth[Authentication]
    Gateway --> Rate[Rate Limiting]
    Gateway --> Log[Logging]
    Gateway --> Twitter[Twitter API]
```

### 2. OAuth Proxy Pattern

The system implements an OAuth Proxy pattern, handling the complete OAuth flow with Twitter while providing a simplified authentication interface to clients.

```mermaid
sequenceDiagram
    participant Client
    participant Proxy
    participant Twitter
    
    Client->>Proxy: Request Auth URL
    Proxy->>Client: Return Auth URL
    Client->>Twitter: Redirect to Auth URL
    Twitter->>Proxy: Callback with Auth Code
    Proxy->>Twitter: Exchange Code for Tokens
    Twitter->>Proxy: Return Tokens
    Proxy->>KV: Store Tokens
    Proxy->>Client: Return Success
```

### 3. Circuit Breaker Pattern

To handle potential Twitter API outages or rate limiting, the system implements a Circuit Breaker pattern to prevent cascading failures.

```mermaid
stateDiagram-v2
    [*] --> Closed
    Closed --> Open: Failure Threshold Exceeded
    Open --> HalfOpen: Timeout Period Elapsed
    HalfOpen --> Closed: Success
    HalfOpen --> Open: Failure
```

### 4. Token Manager Pattern

A dedicated Token Manager handles secure storage, retrieval, and refresh of OAuth tokens.

```mermaid
flowchart TD
    Request[API Request] --> TokenManager[Token Manager]
    TokenManager --> KV[KV Storage]
    TokenManager --> Valid{Token Valid?}
    Valid -->|Yes| UseToken[Use Token]
    Valid -->|No| Refresh[Refresh Token]
    Refresh --> Twitter[Twitter API]
    Twitter --> UpdateToken[Update Token in KV]
    UpdateToken --> UseToken
```

### 5. Rate Limit Manager Pattern

A Rate Limit Manager tracks and enforces both Twitter API rate limits and client-side rate limits.

```mermaid
flowchart TD
    Request[API Request] --> RateLimitCheck[Check Rate Limits]
    RateLimitCheck --> Allowed{Allowed?}
    Allowed -->|Yes| ProcessRequest[Process Request]
    Allowed -->|No| QueueOrReject[Queue or Reject]
    ProcessRequest --> UpdateLimits[Update Rate Limit Counters]
```

### 6. Service Layer Pattern

The application uses a Service Layer pattern to encapsulate business logic and provide a clean separation of concerns.

```mermaid
flowchart TD
    Handler[Request Handler] --> Service[Service Layer]
    Service --> TwitterAPI[Twitter API Client]
    Service --> TokenStore[Token Storage]
    Service --> ErrorHandler[Error Handling]
```

## Component Relationships

### Core Components

```mermaid
classDiagram
    class Router {
        +route(request)
    }
    
    class AuthHandler {
        +initAuth()
        +handleCallback()
        +refreshToken()
        +revokeToken()
    }
    
    class TweetHandler {
        +postTweet()
        +retweet()
        +quoteTweet()
        +deleteTweet()
        +likeTweet()
        +unlikeTweet()
        +replyToTweet()
    }
    
    class MediaHandler {
        +uploadMedia()
        +getMediaStatus()
    }
    
    class TwitterService {
        +getTwitterClient()
        +handleTwitterError()
    }
    
    class TweetService {
        +tweet()
        +retweet()
        +quoteTweet()
        +deleteTweet()
        +replyToTweet()
    }
    
    class LikeService {
        +likeTweet()
        +unlikeTweet()
    }
    
    class MediaService {
        +uploadMedia()
        +getMediaStatus()
        +uploadMediaDirect()
        +setAltTextDirect()
    }
    
    class TokenService {
        +getTokens()
        +saveTokens()
        +refreshTokens()
        +deleteTokens()
    }
    
    class AuthMiddleware {
        +validateApiKey()
        +extractUserId()
    }
    
    class CorsMiddleware {
        +handleCors()
        +addCorsHeaders()
    }
    
    class ErrorMiddleware {
        +handleErrors()
    }
    
    Router --> AuthHandler
    Router --> TweetHandler
    Router --> MediaHandler
    
    AuthHandler --> TwitterService
    TweetHandler --> TweetService
    TweetHandler --> LikeService
    MediaHandler --> MediaService
    
    TweetService --> TwitterService
    TweetService --> MediaService
    LikeService --> TwitterService
    MediaService --> TwitterService
    
    TwitterService --> TokenService
    
    Router --> AuthMiddleware
    Router --> CorsMiddleware
    Router --> ErrorMiddleware
```

## Data Flow Patterns

### Authentication Flow

```mermaid
flowchart TD
    Start[Start Auth] --> InitAuth[Initialize Auth]
    InitAuth --> GenerateState[Generate State]
    GenerateState --> StoreState[Store State in KV]
    StoreState --> BuildURL[Build Twitter Auth URL]
    BuildURL --> ReturnURL[Return URL to Client]
    
    Callback[Auth Callback] --> ValidateState[Validate State]
    ValidateState --> ExchangeCode[Exchange Code for Tokens]
    ExchangeCode --> StoreTokens[Store Tokens in KV]
    StoreTokens --> GenerateSession[Generate Session ID]
    GenerateSession --> ReturnSession[Return Session to Client]
```

### Tweet Posting Flow

```mermaid
flowchart TD
    Start[API Request] --> ValidateAPIKey[Validate API Key]
    ValidateAPIKey --> ExtractUserId[Extract User ID]
    ExtractUserId --> GetTokens[Retrieve Tokens]
    GetTokens --> CheckTokens{Tokens Valid?}
    CheckTokens -->|No| RefreshToken[Refresh Token]
    CheckTokens -->|Yes| ProcessMedia{Has Media?}
    RefreshToken --> ProcessMedia
    
    ProcessMedia -->|Yes| UploadMedia[Upload Media]
    ProcessMedia -->|No| PostTweet[Post Tweet]
    UploadMedia --> PostTweet
    
    PostTweet --> HandleResponse[Handle Response]
    HandleResponse --> ReturnResponse[Return Response]
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
    Classify -->|Twitter API| HandleTwitter[Handle Twitter Error]
    Classify -->|Internal| HandleInternal[Handle Internal Error]
    
    HandleAuth --> RefreshOrRevoke[Refresh or Revoke Token]
    HandleRate --> Backoff[Apply Backoff Strategy]
    HandleTwitter --> RetryOrFail[Retry or Fail Gracefully]
    HandleInternal --> LogAndAlert[Log and Alert]
    
    RefreshOrRevoke --> ReturnError[Return Error Response]
    Backoff --> ReturnError
    RetryOrFail --> ReturnError
    LogAndAlert --> ReturnError
```

## Deployment Patterns

```mermaid
flowchart TD
    Code[Code Changes] --> CI[CI Pipeline]
    CI --> Tests[Run Tests]
    Tests --> Build[Build Worker]
    Build --> DeployStaging[Deploy to Staging]
    DeployStaging --> StagingTests[Run Staging Tests]
    StagingTests --> DeployProd[Deploy to Production]
