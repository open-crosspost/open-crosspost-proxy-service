import { PlatformError } from '@crosspost/types';

/**
 * Enhance a PlatformError with operation context
 * 
 * @param error The PlatformError to enhance
 * @param operation The operation being performed (e.g., 'createPost', 'createThread')
 * @returns The enhanced PlatformError
 */
export function enhanceErrorWithContext(
  error: PlatformError,
  operation: string
): PlatformError {
  // Only modify the message if it doesn't already mention the operation
  if (!error.message.includes(`Failed to ${operation}`)) {
    error.message = `Failed to ${operation}: ${error.message}`;
  }
  return error;
}

