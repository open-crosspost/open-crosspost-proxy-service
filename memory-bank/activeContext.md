# Active Context

## Current Focus: Authentication Enhancement

We are updating the authentication system to provide a more flexible approach based on request type:

### Completed Changes

1. **Authentication System Updates**
   - Added X-Near-Account header support for GET requests
   - Maintained full NEAR auth validation for non-GET requests
   - Added extractNearAccountHeader method to NearAuthService
   - Updated auth middleware to handle both authentication paths

2. **Implementation Details**
   - GET requests only require X-Near-Account header
   - Other requests still require full NEAR auth validation
   - Both paths set signerId in context for consistent downstream usage
   - Error handling remains consistent across both paths

### Current Standard

Authentication now follows this pattern:

```typescript
// GET Requests
headers: {
  'X-Near-Account': 'near-account.testnet'
}

// Other Requests (POST, PUT, DELETE)
headers: {
  'Authorization': 'Bearer <NEAR auth data>',
  'X-Near-Account': 'near-account.testnet'
}
```

### Next Steps

1. **Testing Updates**
   - ✅ Add tests for X-Near-Account header validation
   - ✅ Add tests for GET request authentication flow
   - ✅ Update existing auth tests to cover both paths
   - ✅ Add integration tests for the new authentication pattern
   - ✅ Add SDK integration tests for validation, multi-status responses, and pagination

2. **SDK Client Updates**
   - Update SDK to handle both authentication methods
   - Add helper methods for GET requests
   - Update error handling for new authentication flow
   - Add examples for both authentication paths

3. **Documentation**
   - Update API documentation to reflect new authentication options
   - Add examples for both authentication methods
   - Document security considerations
   - Update sequence diagrams

### Technical Decisions

1. **Authentication Paths**
   - GET requests use simplified header-based auth
   - Other requests require full NEAR auth validation
   - Both paths provide signerId for downstream use
   - Consistent error handling across both paths

2. **Security Considerations**
   - GET requests have reduced security requirements
   - Non-GET requests maintain strong security
   - Header validation ensures account presence
   - Error responses maintain consistency

3. **Implementation Pattern**
   - Auth middleware handles path selection
   - NearAuthService provides header extraction
   - Context setting remains consistent
   - Error handling follows existing patterns

### Open Questions

- Should we add any additional validation for X-Near-Account header?
- Do we need to version this authentication change?
- Should we add rate limiting specific to GET requests?

## Related Files

- `src/middleware/auth.middleware.ts`
- `src/infrastructure/security/near-auth-service.ts`
- `docs/authentication-flow.md`
- `memory-bank/security-plan.md`
