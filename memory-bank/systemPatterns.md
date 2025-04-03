# Social Media API Proxy System Patterns

## Core Design Patterns

### 1. Platform Abstraction Pattern

The system implements a platform abstraction layer that separates the core proxy functionality from
platform-specific implementations. This allows for easy extension to other social media platforms.

```mermaid
flowchart TD
    Client[Client] --> API[API Layer]
    API --> Domain[Domain Services]
    Domain --> Abstraction[Platform Abstraction]
    
    subgraph "Platform Interfaces"
        Abstraction --> Auth[PlatformAuth]
        Abstraction --> Client[PlatformClient]
        Abstraction --> Post[PlatformPost]
        Abstraction --> Media[PlatformMedia]
        Abstraction --> Profile[PlatformProfile]
    end
    
    Auth --> TwitterAuth[Twitter Auth]
    Client --> TwitterClient[Twitter Client]
    Post --> TwitterPost[Twitter Post]
    Media --> TwitterMedia[Twitter Media]
    Profile --> TwitterProfile[Twitter Profile]
```

Each platform interface has a specific responsibility:

- **PlatformAuth**: Handles authentication flows
- **PlatformClient**: Manages API client instances
- **PlatformPost**: Handles post creation and management
- **PlatformMedia**: Manages media uploads and attachments
- **PlatformProfile**: Manages user profile operations

### 2. Authentication Patterns

#### 2.1 Platform-Specific OAuth Proxy Pattern

The system implements a platform-specific OAuth Proxy pattern, handling the complete OAuth flow with
social media platforms through platform-specific routes while providing a simplified authentication
interface to clients.

```mermaid
sequenceDiagram
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

#### 2.2 NEAR Wallet Signature Authentication Pattern

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

### 3. Centralized Schema and Type Pattern

The system implements a Centralized Schema and Type pattern that provides a single source of truth for both TypeScript types and Zod schemas. TypeScript types are derived from Zod schemas using `z.infer<typeof schemaName>`, ensuring consistency between validation and type checking.

```mermaid
flowchart TD
    Schema[Zod Schema] --> DerivedType[TypeScript Type]
    Schema --> Validation[Request Validation]
    Schema --> Documentation[OpenAPI Documentation]
    DerivedType --> TypeChecking[Static Type Checking]
    DerivedType --> SDK[SDK Type Safety]
    
    subgraph "Types Package"
        Schema
        DerivedType
    end
    
    subgraph "API Usage"
        Validation
        TypeChecking
    end
    
    subgraph "SDK Usage"
        SDK
    end
```

This pattern ensures:
- Single source of truth for data models
- Consistency between validation and type checking
- Reduced maintenance overhead
- Improved developer experience
- Better type safety across the codebase

### 4. Base Platform Classes Pattern

The system implements a Base Platform Classes pattern that provides common functionality for
platform-specific implementations.

```mermaid
flowchart TD
    PlatformInterface[Platform Interface] --> BasePlatform[Base Platform Class]
    BasePlatform --> PlatformImpl[Platform Implementation]
    
    BasePlatform --> ErrorHandling[Error Handling]
    BasePlatform --> CommonFunctionality[Common Functionality]
    BasePlatform --> StandardizedApproach[Standardized Approach]
```

The Base Platform Classes pattern includes:

- **BasePlatformClient**: Base implementation of PlatformClient interface
- **BasePlatformAuth**: Base implementation of PlatformAuth interface
- **Common error handling**: Standardized error handling for all platform operations
- **Common functionality**: Shared functionality across platform implementations

This pattern ensures:

- Reduced code duplication
- Consistent error handling
- Standardized approach to platform operations
- Easier implementation of new platforms
- Improved maintainability

### 5. KV Utility Pattern

The system implements a KV Utility pattern that provides a standardized interface for interacting
with Deno KV, with error handling, prefixed keys, and other utilities.

```mermaid
flowchart TD
    Component[Application Component] --> KvStore[KvStore Utility]
    Component --> PrefixedKvStore[PrefixedKvStore Utility]
    
    KvStore --> DenoKv[Deno KV]
    PrefixedKvStore --> KvStore
    
    KvStore --> ErrorHandling[Error Handling]
    KvStore --> Transactions[Transaction Support]
    
    PrefixedKvStore --> PrefixManagement[Prefix Management]
```

The KV Utility pattern includes:

- **KvStore**: Static utility class for direct KV operations
- **PrefixedKvStore**: Instance-based utility for working with prefixed keys
- **Error handling**: Standardized error handling for all KV operations
- **Transaction support**: Simplified transaction handling

## Data Flow Patterns

### NEAR Account Authorization Flow

```mermaid
flowchart TD
    subgraph Authorize
        ReqAuth[POST /auth/authorize/near Request] --> ExtractAuth[Extract NEAR Auth from Header]
        ExtractAuth --> ValidateSigAuth[Validate Signature]
        ValidateSigAuth --> StoreAuth[Store Authorization in KV]
        StoreAuth --> SuccessAuth[Return Success (200)]
        ValidateSigAuth -- Invalid --> ErrorAuth[Return Error (401)]
        StoreAuth -- Error --> ErrorAuth[Return Error (500)]
    end

    subgraph Unauthorize
        ReqUnauth[DELETE /auth/unauthorize/near Request] --> ExtractUnauth[Extract NEAR Auth from Header]
        ExtractUnauth --> ValidateSigUnauth[Validate Signature]
        ValidateSigUnauth --> DeleteAuth[Delete Authorization from KV]
        DeleteAuth --> SuccessUnauth[Return Success (200)]
        ValidateSigUnauth -- Invalid --> ErrorUnauth[Return Error (401)]
        DeleteAuth -- Error --> ErrorUnauth[Return Error (500)]
    end
    
    subgraph CheckStatus
        ReqStatus[GET /auth/authorize/near/status Request] --> ExtractStatus[Extract NEAR Auth from Header]
        ExtractStatus --> ValidateSigStatus[Validate Signature]
        ValidateSigStatus --> CheckKV[Check Authorization in KV]
        CheckKV --> ReturnStatus[Return Status (200)]
        ValidateSigStatus -- Invalid --> ErrorStatus[Return Error (401)]
        CheckKV -- Error --> ErrorStatus[Return Error (500)]
    end
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
