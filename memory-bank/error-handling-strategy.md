# Twitter API Proxy Error Handling Strategy

## Goal

To establish a consistent, robust, and informative error handling system across the entire
application, including the API proxy and the SDK.

## Chosen System: `@crosspost/types` Errors

We will consolidate error handling around the types defined in the `packages/types/src/errors/`
directory:

- **`BaseError`**: The foundation for all custom errors.
- **`ApiError`**: For general application-level errors (validation, auth, internal, etc.). Contains
  `code` (using `ApiErrorCode` enum), `status`, `details`, and `recoverable` properties.
- **`PlatformError`**: For errors originating from platform interactions (token issues, rate limits,
  API errors). Contains `originalError` and `status`.

**Rationale:** This system is already part of the shared types package, promoting consistency
between the proxy and the SDK. It provides distinct error types for different scenarios.

## Consolidation Plan

1. **Deprecate `src/middleware/errors.ts`:**
   - Remove the duplicate `ApiError` class, `ErrorType` enum, and `ErrorCode` enum defined in this
     file.
   - Refactor any code currently importing from or relying on these deprecated types to use the
     types from `@crosspost/types`.
   - The `Errors` constant object might be adapted or removed depending on its usage.
2. **Enhance `PlatformError` / Subclasses:**
   - Ensure that errors originating from platform interactions contain all necessary information for
     consistent handling in middleware and controllers.
   - **Decision:** We will modify the base `PlatformError` class (Option A) to include common
     properties needed for standardized handling: `code: ApiErrorCode`, `recoverable: boolean`,
     `platform: PlatformName`, `userId?: string`, `details?: Record<string, any>`. This allows
     generic handling of `PlatformError` instances without needing `instanceof` checks for
     subclasses like `TwitterError` just to access common data. Subclasses like `TwitterError` will
     be responsible for mapping platform-specific error details to these common properties in their
     constructors.
3. **Refactor Error Handling Logic:**
   - Update `src/controllers/post/base.controller.ts` and `src/middleware/error.middleware.ts` to
     correctly handle `ApiError` and the enhanced `PlatformError` from `@crosspost/types`.
   - Directly access the common properties added to `PlatformError`. Use `status` for the HTTP
     status.
   - Simplify error detail creation. Review `createErrorDetail` (in `response.ts`) and
     `createStandardizedErrorDetail` (in `error-handling.utils.ts`) and consolidate into a single,
     clear utility function, likely adapting `createErrorDetail`. Ensure it's called with the
     correct arguments based on the error type (`ApiError` or `PlatformError`).
4. **Fix TypeScript Errors:** Address all related TypeScript errors identified during the
   `deno check` process, including:
   - Adding missing imports for `ApiErrorCode`.
   - Correcting the import path in `src/infrastructure/platform/twitter/post/create.ts`.
   - Using `ApiErrorCode` enum members instead of string literals.
   - Handling potential `undefined` values correctly (e.g., `successUrl`, `errorUrl` in
     `twitter-auth.ts`).
   - Ensuring type compatibility (e.g., `status` vs `errorCode` in `createStandardizedErrorDetail`).
   - Updating `src/domain/services/post.service.ts` to import types directly from
     `@crosspost/types`.
   - Declaring properties (`details`, etc.) on `TwitterError`.

## Error Propagation

- **Platform Adapters:** Platform-specific code (e.g., `TwitterPost`, `TwitterAuth`) should catch
  platform library errors and convert them into specific `PlatformError` subclasses (e.g.,
  `TwitterError`), populating relevant details.
- **Domain Services:** Services should catch errors from platform adapters and either handle them or
  propagate them (potentially wrapped in `ApiError` if it becomes an application-level issue).
- **Controllers:** Controllers catch errors from services and use helper functions (like
  `handleError` in `BasePostController`) to format them into standardized API error responses using
  `createEnhancedErrorResponse` and `createErrorDetail`.
- **Middleware:** Error handling middleware (`error.middleware.ts`) acts as a final catch-all,
  formatting any uncaught errors into the standard response format.

## SDK Error Handling

- The SDK client should receive the standardized error responses (`EnhancedErrorResponse` with
  `ErrorDetail[]`).
- The SDK should parse these responses and potentially throw corresponding custom SDK errors (which
  could mirror the `ApiError` and `PlatformError` structure) to provide a typed error experience for
  SDK users.

This consolidated approach will lead to more predictable error handling, better type safety, and
clearer error information for both the API consumers and the SDK users.

## Recent Improvements (April 2025)

We've implemented several enhancements to our error handling system:

### 1. Consistent HTTP Status Codes

We've added a centralized `errorCodeToStatusCode` map in `src/utils/error-handling.utils.ts` that
maps `ApiErrorCode` values to HTTP status codes. This ensures consistent HTTP status codes across
the application and eliminates the need for switch statements in multiple places.

```typescript
export const errorCodeToStatusCode: Record<ApiErrorCode, StatusCode> = {
  [ApiErrorCode.UNKNOWN_ERROR]: 500,
  [ApiErrorCode.INTERNAL_ERROR]: 500,
  [ApiErrorCode.VALIDATION_ERROR]: 400,
  [ApiErrorCode.INVALID_REQUEST]: 400,
  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.RATE_LIMITED]: 429,
  // ... other mappings
};
```

## Additional Considerations

### Status vs. StatusCode Property

During implementation, we discovered that the codebase uses `status` rather than `statusCode` for
HTTP status codes in error objects. This is important for consistency:

- The `PlatformError` class should use `status` property (not `statusCode`) to align with existing
  code.
- Error handling middleware and controllers should reference `error.status` when setting HTTP
  response status codes.
- The property should be typed as `StatusCode` from Hono to ensure type safety.

### Error Propagation to UI

For errors to be fully understood by the UI through the SDK:

1. **Consistent Error Properties**: Ensure all error objects have consistent properties (`message`,
   `code`, `recoverable`, `platform`, `userId`, `details`, `status`).
2. **Meaningful Error Codes**: Use specific `ApiErrorCode` values that the UI can interpret and
   display appropriate messages for.
3. **Recoverable Flag**: The `recoverable` property is crucial for the UI to determine if the user
   can retry the operation or needs to take specific actions.
4. **Rich Error Details**: Include relevant context in the `details` property to help diagnose
   issues.
5. **Platform Context**: Always include the `platform` property to help the UI understand which
   platform the error is related to.

### Error Mapping Strategy

Rather than complex mapping logic in multiple places, consider:

1. **Centralized Error Factory**: Create a centralized error factory that maps from
   platform-specific errors to standardized `PlatformError` instances.
2. **Error Type Registry**: Maintain a registry of error types and their properties (code,
   recoverable, status) to ensure consistency.
3. **Error Serialization**: Ensure errors are properly serialized when sent to the client,
   preserving all relevant properties.

This approach would reduce duplication and ensure consistent error handling across the codebase.
