# Open Crosspost Proxy Service: Security Plan

## Overview

The security architecture of the Open Crosspost Proxy Service is designed to protect sensitive user
data, particularly OAuth tokens, while providing secure and reliable access to social media
platforms.

```mermaid
flowchart TD
    Client[Client Application] --> Auth[Authentication Layer]
    Auth --> Token[Token Management]
    Auth --> Access[Access Control]
    
    subgraph "Security Layers"
        Auth
        Token --> Encryption[Encryption Service]
        Token --> Storage[Secure Storage]
        Access --> Audit[Audit Logging]
    end
```

## Core Security Components

### 1. Authentication System

```mermaid
flowchart LR
    A[Client] -->|1. Sign Message| B[NEAR Wallet]
    B -->|2. Return Signature| A
    A -->|3. Send Signature| C[Proxy Service]
    C -->|4. Verify Signature| D[Auth Service]
    D -->|5. Issue Token| C
    C -->|6. Return Token| A
```

**Implementation:**

- NEAR wallet signature-based authentication
- API key validation for applications
- OAuth token management for platforms
- Signature verification and validation

### 2. Token Security

```mermaid
classDiagram
    class TokenManager {
        +storeToken(token: Token)
        +retrieveToken(id: string)
        +rotateKey()
        +revokeToken(id: string)
    }
    
    class EncryptionService {
        +encrypt(data: any)
        +decrypt(data: any)
        +generateKey()
        +deriveKey(userId: string)
    }
    
    TokenManager --> EncryptionService
```

**Features:**

- AES-GCM encryption
- Key versioning support
- Secure key storage
- Token lifecycle management

### 3. Access Control

```mermaid
flowchart TD
    Request[API Request] --> CORS[CORS Check]
    CORS --> Auth[Auth Validation]
    Auth --> Rate[Rate Limiting]
    Rate --> Action[Authorized Action]
```

**Implementation:**

- CORS restrictions
- Origin validation
- Rate limiting
- Permission checks

## Implementation Phases

### Phase 1: Foundation Security ✅

1. **Token Encryption**
   - Implemented AES-GCM encryption
   - Added key versioning support
   - Established secure key management

2. **Access Control**
   - NEAR wallet integration
   - API key validation
   - CORS configuration

3. **Audit Logging**
   - PII redaction
   - Operation logging
   - Access tracking

### Phase 2: Enhanced Security 🔄

1. **Token Management**
   - Metadata separation
   - Expiry tracking
   - Access patterns monitoring

2. **Key Management**
   - Automatic key rotation
   - User-specific key derivation
   - Key backup procedures

3. **Monitoring**
   - Anomaly detection
   - Alert system
   - Security metrics

### Phase 3: Advanced Features 📋

1. **Zero-Trust Architecture**
   - Request-level verification
   - Context-based access
   - Continuous validation

2. **Threat Prevention**
   - Rate limit optimization
   - DDoS protection
   - Abuse prevention

3. **Compliance**
   - Audit improvements
   - Policy enforcement
   - Compliance reporting

## Security Measures

### 1. Data Protection

- Encryption at rest and in transit
- Secure key management
- Data minimization
- Regular security audits

### 2. Access Security

- Multi-factor authentication
- Strict CORS policies
- Token validation
- Rate limiting

### 3. Monitoring

- Real-time alerts
- Access logging
- Error tracking
- Performance monitoring

### 4. Incident Response

- Alert procedures
- Response playbooks
- Recovery plans
- Stakeholder communication

## Best Practices

1. **Encryption**
   - Use strong algorithms (AES-GCM)
   - Implement proper key sizes
   - Secure IV generation
   - Regular key rotation

2. **Authentication**
   - Validate all requests
   - Verify signatures
   - Check permissions
   - Monitor access patterns

3. **Development**
   - Input validation
   - Error handling
   - Dependency management
   - Code review

4. **Operations**
   - Regular updates
   - Security patches
   - Configuration management
   - Access control

## SDK Security

### Cookie-Based Authentication

The SDK implements a secure cookie-based authentication strategy with the following security
measures:

```mermaid
flowchart TD
    A[Client App] -->|1. Get NEAR Signature| B[NEAR Wallet]
    B -->|2. Return Signature| A
    A -->|3. Call setAuthentication| C[CrosspostClient]
    C -->|4. Store in Cookie| D[Browser Cookie]
    C -->|5. Use for Requests| E[API Endpoints]
    D -->|Auto-load on init| C
```

**Cookie Security Settings:**

- `HttpOnly`: Prevents JavaScript access to the cookie content (`__crosspost_auth`).
- `Secure`: Ensures the cookie is only sent over HTTPS connections.
- `SameSite=Lax`: Restricts cookies to same-site contexts and top-level navigations for improved
  security.
- `Path=/`: Limits cookie scope to the entire domain.

**CSRF Protection Implementation:** The SDK implements CSRF protection using:

1. Signed CSRF tokens stored in a non-HttpOnly cookie (`XSRF-TOKEN`) provided by the backend.
2. Token inclusion in the `X-CSRF-Token` header with each state-changing request.
3. Backend validation that the token in the header matches the signed token in the cookie (Double
   Submit Cookie pattern).
4. Cryptographic signature verification of the cookie token to prevent tampering.
5. Additional browser-provided CSRF protection through `SameSite=Lax` setting.
