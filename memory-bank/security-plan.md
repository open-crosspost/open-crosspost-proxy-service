# Social Media API Proxy Security Plan

This document outlines the comprehensive security plan for the Social Media API Proxy, focusing on protecting sensitive user data, particularly OAuth tokens stored in Deno KV.

## Security Objectives

1. **Data Protection**: Ensure all sensitive data is encrypted at rest and in transit
2. **Access Control**: Implement proper authentication and authorization
3. **Audit Trail**: Maintain comprehensive logs of security-relevant operations
4. **Secure Configuration**: Validate and enforce secure configuration settings
5. **Incident Response**: Prepare for security incidents with proper monitoring and alerting

## Implementation Phases

The security enhancements are being implemented in three phases:

### Phase 1: Immediate Improvements (Completed)

#### 1. Enhanced Encryption Implementation with Key Versioning

We've implemented versioned encryption for tokens stored in Deno KV:

- Added version identifier to encrypted data (prepended version byte)
- Updated encryption to use AES-GCM with proper key handling
- Implemented backward compatibility for existing tokens
- Prepared for future key rotation with version-aware decryption
- Added cryptographic key derivation for non-standard key sizes using SHA-256

```typescript
// Version constants for encryption
private readonly ENCRYPTION_VERSION_1 = 0x01;
private readonly CURRENT_ENCRYPTION_VERSION = this.ENCRYPTION_VERSION_1;

// Normalize the key to a valid AES-GCM size using SHA-256 if needed
if (rawKeyData.length === 16 || rawKeyData.length === 24 || rawKeyData.length === 32) {
  // Key is already a valid size, use it directly
  keyData = rawKeyData;
} else {
  // Use SHA-256 to derive a 32-byte key
  const hashBuffer = await crypto.subtle.digest('SHA-256', rawKeyData);
  keyData = new Uint8Array(hashBuffer);
}

// Create result with version byte + IV + encrypted data
const result = new Uint8Array(1 + iv.length + encryptedData.byteLength);
result[0] = this.CURRENT_ENCRYPTION_VERSION; // Version byte
result.set(iv, 1);
result.set(new Uint8Array(encryptedData), 1 + iv.length);
```

#### 2. Token Access Logging

We've implemented comprehensive logging for all token operations:

- Created a dedicated `TokenAccessLogger` class
- Implemented PII redaction for user IDs in logs
- Added logging for all token operations (get, save, delete, check)
- Stored logs in Deno KV with timestamp-based keys for chronological ordering
- Added development-mode console logging

```typescript
export enum TokenOperation {
  GET = "get",
  SAVE = "save",
  DELETE = "delete",
  CHECK = "check",
}

// Redact a user ID for privacy in logs
private redactUserId(userId: string): string {
  if (userId.length <= 8) {
    return userId; // Too short to redact meaningfully
  }
  
  const prefix = userId.substring(0, 4);
  const suffix = userId.substring(userId.length - 4);
  return `${prefix}***${suffix}`;
}
```

#### 3. Secure Default Configurations

We've enhanced environment configuration to ensure secure defaults:

- Added validation for critical security parameters
- Implemented warnings for insecure configurations
- Added strict validation in production environments
- Prevented use of default encryption keys in production

```typescript
export function validateSecurityConfig(env: Env): { 
  isValid: boolean; 
  warnings: string[]; 
  errors: string[] 
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check encryption key
  if (env.ENCRYPTION_KEY === "default-encryption-key") {
    if (isProduction() || isStaging()) {
      errors.push("Default encryption key used in production/staging environment");
    } else {
      warnings.push("Default encryption key used - not secure for production");
    }
  }
  
  // Additional validation...
}
```

### Phase 2: Structural Enhancements (Planned)

#### 1. Metadata Separation

- Store sensitive token data separately from non-sensitive metadata
- Implement different security levels for different data types
- Create a metadata index for efficient querying

#### 2. Token Expiry Management

- Add explicit expiry tracking in the KV store
- Implement automatic token cleanup for expired tokens
- Create a background job for token expiration management

#### 3. Anomaly Detection

- Monitor for unusual token access patterns
- Implement rate limiting for token retrieval operations
- Create alerts for suspicious activities
- Track failed decryption attempts

### Phase 3: Advanced Security Features (Planned)

#### 1. Key Rotation Mechanism

- Implement automatic key rotation on a schedule
- Create a key management service
- Support multiple active encryption keys
- Add key version tracking

#### 2. User-specific Key Derivation

- Implement key derivation functions to create user-specific encryption keys
- Add an extra layer of security by having different keys for different users
- Use HKDF (HMAC-based Key Derivation Function) for key derivation

#### 3. Enhanced Token Revocation

- Implement immediate token invalidation for compromised tokens
- Maintain a revocation list for emergency situations
- Create an admin interface for token management

## Security Best Practices

### Encryption

- Use AES-GCM for authenticated encryption
- Use proper key sizes (16, 24, or 32 bytes)
- Generate cryptographically secure random IVs
- Never reuse IVs with the same key
- Implement proper key management

### Access Control

- Validate all API requests with proper authentication
- Implement NEAR wallet signature verification
- Use API keys for client applications
- Validate origins against allowed list
- Implement proper CORS restrictions

### Logging and Monitoring

- Redact PII in all logs
- Implement structured logging
- Create alerts for security events
- Monitor for unusual patterns
- Maintain audit logs for security operations

### Secure Coding

- Validate all input data
- Use parameterized queries
- Implement proper error handling
- Follow the principle of least privilege
- Keep dependencies up to date

## Incident Response Plan

1. **Detection**: Monitor logs and alerts for security incidents
2. **Containment**: Isolate affected systems and revoke compromised tokens
3. **Eradication**: Remove the cause of the incident
4. **Recovery**: Restore systems to normal operation
5. **Lessons Learned**: Document the incident and improve security measures

## Security Testing

- Implement regular security testing
- Conduct code reviews with security focus
- Perform penetration testing
- Use automated security scanning tools
- Test token encryption and decryption

## Compliance Considerations

- Ensure GDPR compliance for EU users
- Implement proper data retention policies
- Provide mechanisms for data export and deletion
- Document security measures
- Maintain audit trails for compliance purposes
