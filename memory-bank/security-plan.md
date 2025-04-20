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

The system now supports two authentication paths based on request type:

```mermaid
flowchart TD
    A[Request] --> B{GET Request?}
    B -->|Yes| C[X-Near-Account Header]
    B -->|No| D[NEAR Auth Validation]
    C --> E[Extract Account]
    D --> F[Validate Signature]
    E --> G[Set signerId]
    F --> G
    G --> H[Continue Request]
```

**GET Request Flow:**
```mermaid
flowchart LR
    A[Client] -->|1. X-Near-Account Header| B[Proxy Service]
    B -->|2. Extract Account| C[Auth Service]
    C -->|3. Set Context| B
    B -->|4. Process Request| D[API Handler]
```

**Non-GET Request Flow:**
```mermaid
flowchart LR
    A[Client] -->|1. Sign Message| B[NEAR Wallet]
    B -->|2. Return Signature| A
    A -->|3. Send Signature| C[Proxy Service]
    C -->|4. Verify Signature| D[Auth Service]
    D -->|5. Set Context| C
    C -->|6. Process Request| E[API Handler]
```

**Implementation:**
- X-Near-Account header validation for GET requests
- NEAR wallet signature-based authentication for non-GET requests
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
    Request[API Request] --> Method{HTTP Method}
    Method -->|GET| Header[X-Near-Account Check]
    Method -->|Other| Auth[Full Auth Check]
    Header --> Rate[Rate Limiting]
    Auth --> Rate
    Rate --> Action[Authorized Action]
```

**Implementation:**
- Method-based authentication requirements
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
   - Method-based auth paths

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

- Method-based authentication
- Multi-factor authentication for sensitive operations
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

1. **Authentication**
   - Validate all requests according to method
   - Verify signatures for non-GET requests
   - Validate X-Near-Account header format
   - Check permissions based on context
   - Monitor access patterns

2. **Encryption**
   - Use strong algorithms (AES-GCM)
   - Implement proper key sizes
   - Secure IV generation
   - Regular key rotation

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

### Authentication Strategy

The SDK implements a flexible authentication strategy based on request type:

```mermaid
flowchart TD
    A[Client App] -->|GET Request| B1[Add X-Near-Account]
    A -->|Other Request| B2[Get Fresh Signature]
    B2 -->|Sign Request| C[CrosspostClient]
    B1 --> C
    C -->|Include Headers| D[API Request]
    D -->|Server Validates| E[API Endpoints]
```

**Security Benefits:**

1. **Flexible Authorization**
   - Simplified auth for read operations
   - Strong auth for write operations
   - Consistent context handling
   - Method-appropriate security

2. **Enhanced Security**
   - No client-side storage of credentials
   - Each write request independently verified
   - Reduced attack surface
   - No session-based vulnerabilities

3. **Request Validation**
   - Method-based validation rules
   - Header format verification
   - Account validation
   - Rate limiting per method
