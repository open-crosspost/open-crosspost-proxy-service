import { ApiErrorCode } from "@crosspost/types";

/**
 * Create a mock error response from Twitter API
 * @param code Twitter error code
 * @param message Error message
 * @param statusCode HTTP status code
 * @returns Mock Twitter API error
 */
export function createMockTwitterError(
  code: number,
  message: string,
  statusCode: number
): any {
  return {
    code: statusCode,
    errors: [
      {
        code,
        message,
      },
    ],
    data: {
      errors: [
        {
          code,
          message,
        },
      ],
    },
  };
}

/**
 * Map of Twitter error codes to API error codes
 */
export const twitterErrorToApiErrorCode: Record<number, ApiErrorCode> = {
  88: ApiErrorCode.RATE_LIMITED,
  89: ApiErrorCode.UNAUTHORIZED,
  32: ApiErrorCode.UNAUTHORIZED,
  34: ApiErrorCode.NOT_FOUND,
  87: ApiErrorCode.FORBIDDEN,
  64: ApiErrorCode.FORBIDDEN,
  187: ApiErrorCode.DUPLICATE_CONTENT,
  130: ApiErrorCode.PLATFORM_UNAVAILABLE,
  131: ApiErrorCode.PLATFORM_ERROR,
  324: ApiErrorCode.MEDIA_UPLOAD_FAILED,
  323: ApiErrorCode.MEDIA_UPLOAD_FAILED,
  93: ApiErrorCode.MEDIA_UPLOAD_FAILED,
  226: ApiErrorCode.CONTENT_POLICY_VIOLATION,
};
