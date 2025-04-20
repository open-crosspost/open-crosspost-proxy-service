import type { ErrorDetails, PlatformName } from '@crosspost/types';
import { ApiErrorCode, errorCodeToStatusCode } from '@crosspost/types';
import { ApiError } from './api-error.ts';

/**
 * Platform Error
 * Custom error class for platform-specific errors
 */
export class PlatformError extends ApiError {
  public readonly platform: PlatformName;

  constructor(
    message: string,
    code: ApiErrorCode,
    platform: PlatformName,
    details?: ErrorDetails,
    recoverable: boolean = false,
  ) {
    // Merge platform into details
    const errorDetails = details ? { ...details, platform } : { platform };
    super(message, code, errorCodeToStatusCode[code], errorDetails, recoverable);
    this.platform = platform;
  }
}

/**
 * Create a platform-specific error
 * @param message Error message
 * @param code Error code (defaults to PLATFORM_ERROR)
 * @param platform The platform where the error occurred
 * @param details Optional additional error details
 * @param recoverable Whether the error is recoverable
 */
export function createPlatformError(
  code: ApiErrorCode = ApiErrorCode.PLATFORM_ERROR,
  message: string,
  platform: PlatformName,
  details?: ErrorDetails,
  recoverable: boolean = false,
): PlatformError {
  return new PlatformError(
    message,
    code,
    platform,
    details,
    recoverable,
  );
}
