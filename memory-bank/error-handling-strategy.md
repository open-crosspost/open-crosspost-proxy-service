# Error Handling Strategy

## Overview

The error handling system is designed to provide consistent error reporting and handling across all
layers of the application: platform integrations, API, and SDK.

## Core Components

### 1. Error Types (`packages/types/src/errors.ts`)

```typescript
interface ErrorDetails {
  platform?: PlatformName;
  userId?: string;
  [key: string]: unknown;
}

interface ErrorDetail {
  message: string;
  code: ApiErrorCode;
  recoverable: boolean;
  details?: ErrorDetails;
}
```

### 2. Error Classes

- **ApiError**: Base error class for all application errors
  ```typescript
  class ApiError extends Error {
    code: ApiErrorCode;
    status: StatusCode;
    details?: ErrorDetails;
    recoverable: boolean;
  }
  ```

- **PlatformError**: For platform-specific errors
  ```typescript
  class PlatformError extends ApiError {
    platform: PlatformName;
  }
  ```

### 3. Error Response Format

```typescript
{
  success: false,
  errors: [{
    message: string;
    code: ApiErrorCode;
    recoverable: boolean;
    details?: {
      platform?: PlatformName;
      userId?: string;
      [key: string]: unknown;
    }
  }],
  meta: ResponseMeta;
}
```

## Error Flow

1. **Platform Layer**:
   - Platform-specific errors are caught and transformed into `PlatformError` instances
   - Platform context is included in the error details
   ```typescript
   throw new TwitterError(
     'Failed to like post',
     ApiErrorCode.POST_INTERACTION_FAILED,
     {
       platformErrorCode: 400,
       platformMessage: errorMessage,
     },
     true,
   );
   ```

2. **API Layer**:
   - Controllers catch errors and pass them to `BaseController.handleError`
   - Errors are transformed into API responses using `createErrorDetail` and `createErrorResponse`
   ```typescript
   try {
     // API operation
   } catch (error) {
     return this.handleError(error, c);
   }
   ```

3. **SDK Layer**:
   - API error responses are parsed into `CrosspostError` instances
   - Error details are preserved and accessible via properties and helper functions
   ```typescript
   if (isPostError(error) && error.platform === 'twitter') {
     console.log(error.message);
     console.log(error.details.platformMessage);
   }
   ```

## Error Categories

Errors are categorized by their `ApiErrorCode`:

- Authentication: `UNAUTHORIZED`, `FORBIDDEN`
- Validation: `VALIDATION_ERROR`, `INVALID_REQUEST`
- Network: `NETWORK_ERROR`, `PLATFORM_UNAVAILABLE`
- Platform: `PLATFORM_ERROR`
- Content: `CONTENT_POLICY_VIOLATION`, `DUPLICATE_CONTENT`
- Rate Limiting: `RATE_LIMITED`
- Post Operations: `POST_CREATION_FAILED`, `POST_INTERACTION_FAILED`, etc.
- Media: `MEDIA_UPLOAD_FAILED`

## Best Practices

1. **Error Creation**:
   - Use factory functions (`createApiError`, `createPlatformError`) for consistent error creation
   - Include relevant context in the details object
   - Set appropriate error codes and recovery flags

2. **Error Handling**:
   - Use type-checking functions (`isAuthError`, `isPlatformError`, etc.) to handle specific error
     types
   - Check `error.recoverable` to determine if retry is possible
   - Access platform/user context via error details

3. **Error Response**:
   - Always use `createErrorResponse` to format error responses
   - Include all relevant error details for debugging
   - Use appropriate HTTP status codes based on error type

## Example Usage

```typescript
// Creating platform errors
throw createPlatformError(
  'Failed to like post',
  ApiErrorCode.POST_INTERACTION_FAILED,
  Platform.TWITTER,
  {
    userId: '123',
    platformErrorCode: 400,
  },
);

// Handling errors in SDK
try {
  await client.posts.like(postId);
} catch (error) {
  if (isRateLimitError(error)) {
    const reset = error.details?.rateLimit?.reset;
    console.log(`Rate limited until ${new Date(reset)}`);
  }
}
```
