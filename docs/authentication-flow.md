# Authentication and API Call Flows

This document outlines the key sequence of events for user authentication, platform account linking,
and subsequent API calls within the Social Media API Proxy.

## Flow 1: Initial NEAR Account Authorization & Platform Account Linking

This flow describes how a user authorizes their NEAR account with the proxy and then links a
specific social media platform account (e.g., Twitter) to it.

```mermaid
sequenceDiagram
    participant ClientApp as Client Application
    participant ProxyAPI as Proxy API Endpoint
    participant AuthCtrl as AuthController
    participant AuthSvc as AuthService
    participant PlatformAuth as PlatformAuth Impl (e.g., TwitterAuth)
    participant TokenMgr as NearAuthService
    participant NearAuthSvc as NearAuthService (via TokenMgr)
    participant TokenStore as TokenStorage (via TokenMgr)
    participant PlatformOAuth as Platform OAuth Provider

    %% Step 1: Authorize NEAR Account %%
    ClientApp->>ProxyAPI: POST /auth/authorize/near (with NEAR Sig)
    ProxyAPI->>AuthCtrl: authorizeNear(c)
    AuthCtrl->>TokenMgr: authorizeNearAccount(signerId)
    TokenMgr->>NearAuthSvc: authorizeNearAccount(signerId)
    NearAuthSvc-->>TokenMgr: Success
    TokenMgr-->>AuthCtrl: Success
    AuthCtrl-->>ProxyAPI: 200 OK Response
    ProxyAPI-->>ClientApp: Success

    %% Step 2: Initiate Platform Linking %%
    ClientApp->>ProxyAPI: POST /auth/{platform}/login (with NEAR Sig, successUrl, errorUrl)
    ProxyAPI->>AuthCtrl: initializeAuth(c, platform)
    AuthCtrl->>AuthCtrl: Validate NEAR Sig & Check Auth Status (via TokenMgr)
    alt NEAR Account Authorized
        AuthCtrl->>AuthSvc: initializeAuth(platform, signerId, callbackUrl, scopes, successUrl, errorUrl)
        AuthSvc->>PlatformAuth: initializeAuth(callbackUrl, scopes)
        PlatformAuth-->>AuthSvc: {authUrl, state, codeVerifier}
        AuthSvc->>TokenMgr: Store AuthState(state, signerId, successUrl, errorUrl, ...) in KV
        AuthSvc-->>AuthCtrl: {authUrl, state}
        AuthCtrl-->>ProxyAPI: 200 OK Response {authUrl, state}
        ProxyAPI-->>ClientApp: {authUrl, state}
    else NEAR Account Not Authorized
        AuthCtrl-->>ProxyAPI: 403 Forbidden Response
        ProxyAPI-->>ClientApp: 403 Forbidden
    end

    %% Step 3: User Authorizes on Platform %%
    ClientApp->>PlatformOAuth: Redirect User to authUrl
    PlatformOAuth-->>ClientApp: User Grants Access on Platform Site
    Note over PlatformOAuth, ClientApp: Platform redirects user back to Proxy callback

    %% Step 4: Handle Platform Callback & Link Account %%
    ClientApp->>ProxyAPI: GET /auth/{platform}/callback?code=...&state=...
    ProxyAPI->>AuthCtrl: handleCallback(c, platform)
    AuthCtrl->>AuthSvc: handleCallback(platform, code, state)
    AuthSvc->>TokenMgr: Retrieve AuthState(state) -> {signerId, successUrl, errorUrl, codeVerifier}
    AuthSvc->>PlatformAuth: exchangeCodeForTokens(code, callbackUrl, codeVerifier)
    PlatformAuth-->>AuthSvc: {userId, token}
    AuthSvc->>TokenMgr: saveTokens(userId, platform, token)
    TokenMgr->>TokenStore: Encrypt and Save Token
    AuthSvc->>TokenMgr: linkAccount(signerId, platform, userId)
    TokenMgr->>NearAuthSvc: Store Link(signerId, platform, userId)
    AuthSvc->>TokenMgr: Delete AuthState(state) from KV
    AuthSvc-->>AuthCtrl: {userId, successUrl}
    AuthCtrl-->>ProxyAPI: 302 Redirect Response (to successUrl)
    ProxyAPI->>ClientApp: Redirect to successUrl?userId=...&platform=...&success=true
```

## Flow 2: API Calls with Method-Based Authentication

This flow describes how an authorized client application makes API calls using either the simplified
GET request authentication or full NEAR signature authentication for other methods.

```mermaid
sequenceDiagram
    participant ClientApp as Client Application
    participant ProxyAPI as Proxy API Endpoint
    participant AuthMW as AuthMiddleware
    participant NearAuthSvc as NearAuthService
    participant Controller as API Controller
    participant Service as Domain Service
    participant TokenMgr as NearAuthService
    participant TokenStore as TokenStorage
    participant PlatformAPI as External Platform API

    alt GET Request
        %% Step 1: Client Makes GET Request %%
        ClientApp->>ProxyAPI: GET /api/resource (X-Near-Account header)
        ProxyAPI->>AuthMW: Intercept Request
        AuthMW->>NearAuthSvc: extractNearAccountHeader(c)
        NearAuthSvc-->>AuthMW: signerId
        AuthMW->>AuthMW: Set signerId in Context
        AuthMW->>Controller: Forward Request
    else Other Request (POST, PUT, DELETE)
        %% Step 1: Client Prepares and Signs Request %%
        ClientApp->>ClientApp: Generate NEAR Signature
        ClientApp->>ProxyAPI: POST/PUT/DELETE /api/resource (with Auth Header)
        ProxyAPI->>AuthMW: Intercept Request
        AuthMW->>NearAuthSvc: extractAndValidateNearAuth(c)
        NearAuthSvc->>NearAuthSvc: Validate Signature
        NearAuthSvc-->>AuthMW: {signerId, authData}
        AuthMW->>AuthMW: Set signerId in Context
        AuthMW->>Controller: Forward Request
    end

    %% Step 2: Common Flow After Authentication %%
    Controller->>Controller: Extract Request Parameters
    Controller->>Service: Process Request
    Service->>TokenMgr: getTokens(userId, platform)
    TokenMgr->>TokenStore: Retrieve Token
    TokenStore-->>TokenMgr: Token
    Service->>PlatformAPI: Make API Call
    PlatformAPI-->>Service: Response
    Service-->>Controller: Result
    Controller-->>ProxyAPI: Format Response
    ProxyAPI-->>ClientApp: HTTP Response
```

**Description:**

1. **GET Request Authentication:**
   - Client includes X-Near-Account header
   - AuthMiddleware extracts NEAR account from header
   - No signature validation required
   - Sets signerId in context for downstream use

2. **Other Request Authentication:**
   - Client generates NEAR signature
   - AuthMiddleware performs full signature validation
   - Validates authorization status
   - Sets signerId in context for downstream use

3. **Common Processing:**
   - Controller extracts necessary parameters
   - Service processes request using signerId from context
   - Token retrieval and platform API calls remain unchanged
   - Response formatting follows standard patterns

4. **Security Considerations:**
   - GET requests use simplified authentication for read operations
   - Write operations maintain strong security with signature validation
   - Both paths provide consistent context for downstream processing
   - Error handling remains uniform across both paths

5. **Implementation Notes:**
   - AuthMiddleware determines authentication path based on HTTP method
   - NearAuthService provides both header extraction and signature validation
   - Context setting remains consistent for uniform downstream handling
   - Error responses maintain standard format across both paths
