# API Types and Schemas

## Core Response Structure

All API responses follow a standardized structure defined by the `ApiResponse<T>` interface:

```typescript
interface ApiResponse<T> {
  /** Indicates if the operation was successful */
  success: boolean;

  /** The primary data payload. Present when success is true */
  data?: T | MultiStatusData | null;

  /** Array of error details. Present when success is false */
  errors?: ErrorDetail[] | null;

  /** Metadata about the response. Always present */
  meta: ResponseMeta;
}
```

### Response Metadata

Every response includes a `meta` object with standardized fields:

```typescript
interface ResponseMeta {
  /** Unique identifier for the request, used for tracing and debugging */
  requestId: string;

  /** ISO timestamp of when the response was generated */
  timestamp: string;

  /** Rate limit information if applicable */
  rateLimit?: {
    remaining: number;
    limit: number;
    reset: number;
  };

  /** Pagination information if applicable */
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    nextCursor?: string;
    prevCursor?: string;
  };
}
```

### Error Details

Error responses use a standardized `ErrorDetail` structure:

```typescript
interface ErrorDetail {
  /** Platform identifier if error is platform-specific */
  platform?: string;

  /** User ID if error is user-specific */
  userId?: string;

  /** Always 'error' */
  status: 'error';

  /** User-friendly error message */
  error: string;

  /** Machine-readable error code */
  errorCode: string;

  /** Whether the client can potentially retry or recover */
  recoverable: boolean;

  /** Additional error context */
  details?: Record<string, any>;
}
```

### Multi-Status Operations

For operations affecting multiple items (like bulk actions), we use the `MultiStatusData` structure:

```typescript
interface MultiStatusData {
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
  results: SuccessDetail[];
  errors: ErrorDetail[];
}

interface SuccessDetail {
  platform: string;
  userId: string;
  status: 'success';
  [key: string]: any;
}
```

## Response Status Codes

- **200 OK**: Successful operation with data
- **207 Multi-Status**: Partial success/failure in bulk operations
- **4xx/5xx**: Error conditions, always include error details

## Helper Functions

The `@crosspost/types` package provides standard helper functions:

- `createSuccessResponse<T>(data, meta?)`: Create a success response
- `createErrorResponse(errors, meta?)`: Create an error response
- `createErrorDetail(...)`: Create an error detail object
- `createSuccessDetail(...)`: Create a success detail for multi-status
- `createMultiStatusData(...)`: Create a multi-status response

## SDK Error Handling

The SDK provides robust error handling that enforces this structure:

- Validates response format strictly
- Converts error responses to appropriate error types:
  - `ApiError`: General API errors
  - `PlatformError`: Platform-specific errors
  - `CompositeApiError`: Multiple errors from a single operation
- Provides utility functions for error categorization and handling

## Usage Examples

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Example"
  },
  "meta": {
    "requestId": "uuid-here",
    "timestamp": "2025-04-18T12:00:00Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "errors": [{
    "status": "error",
    "error": "Invalid input",
    "errorCode": "VALIDATION_ERROR",
    "recoverable": true,
    "details": {
      "field": "name",
      "reason": "required"
    }
  }],
  "meta": {
    "requestId": "uuid-here",
    "timestamp": "2025-04-18T12:00:00Z"
  }
}
```

### Multi-Status Response

```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 2,
      "succeeded": 1,
      "failed": 1
    },
    "results": [{
      "platform": "twitter",
      "userId": "123",
      "status": "success",
      "postId": "456"
    }],
    "errors": [{
      "platform": "twitter",
      "userId": "789",
      "status": "error",
      "error": "Rate limited",
      "errorCode": "RATE_LIMITED",
      "recoverable": true
    }]
  },
  "meta": {
    "requestId": "uuid-here",
    "timestamp": "2025-04-18T12:00:00Z"
  }
}
```
