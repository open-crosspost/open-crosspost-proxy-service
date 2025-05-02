# API Types and Schemas

## Core Response Structure

All API responses follow a standardized structure defined by the `ApiResponse<T>` interface:

```typescript
interface ApiResponse<T> {
  /** Indicates if the operation was successful */
  success: boolean;

  /** The primary data payload. Present when success is true */
  data?: T | null;

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
    limit: number; // Number of items per page
    offset: number; // Number of items to skip
    total: number; // Total number of items
  };
}
```

#### Pagination Implementation

The API supports offset-based pagination for endpoints that return large collections:

1. **Request Parameters**:
   - `limit`: Maximum number of items to return (default varies by endpoint)
   - `offset`: Number of items to skip (default: 0)

2. **Response Metadata**:
   - `meta.pagination.limit`: Number of items requested per page
   - `meta.pagination.offset`: Current offset
   - `meta.pagination.total`: Total number of items available

3. **Usage Example**:
   ```typescript
   // Request with pagination parameters
   GET /api/activity?limit=10&offset=20

   // Response includes pagination metadata
   {
     "success": true,
     "data": [...],
     "meta": {
       "requestId": "uuid-here",
       "timestamp": "2025-04-18T12:00:00Z",
       "pagination": {
         "limit": 10,
         "offset": 20,
         "total": 100
       }
     }
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
  details: {
    id: string;
    [key: string]: any;
  };
}
```

#### Multi-Status Implementation

The API uses multi-status responses for operations that target multiple platforms or resources:

1. **Response Structure**:
   - `summary`: Contains counts of total operations, successes, and failures
   - `results`: Array of successful operations with platform-specific details
   - `errors`: Array of failed operations with error details

2. **Error Handling**:
   - Partial success: Returns HTTP 207 with both results and errors
   - Complete success: Returns HTTP 200 with only results
   - Complete failure: Returns HTTP 400 with error details

3. **SDK Behavior**:
   - For partial success: Returns a success response with multi-status data
   - For complete failure: Throws a `CrosspostError` with all errors in `details.errors`
   - Error structure is consistent between `response.data.errors` and `error.details.errors`

4. **Usage Example**:
   ```typescript
   // Request targeting multiple platforms
   POST /api/post
   {
     "targets": [
       { "platform": "twitter", "userId": "user1" },
       { "platform": "facebook", "userId": "user2" }
     ],
     "content": [{ "text": "Hello world!" }]
   }

   // Partial success response (HTTP 207)
   {
     "success": true,
     "data": {
       "summary": { "total": 2, "succeeded": 1, "failed": 1 },
       "results": [{
         "platform": "twitter",
         "userId": "user1",
         "status": "success",
         "details": { "id": "post-123", "createdAt": "2025-04-18T12:00:00Z" }
       }],
       "errors": [{
         "platform": "facebook",
         "userId": "user2",
         "status": "error",
         "error": "Rate limited",
         "errorCode": "RATE_LIMITED",
         "recoverable": true
       }]
     },
     "meta": { "requestId": "uuid-here", "timestamp": "2025-04-18T12:00:00Z" }
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
