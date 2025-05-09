import { z } from 'zod';

/**
 * Zod schema for sanitizing error objects
 */
export const ErrorDetailsSchema = z.object({
  name: z.string().optional(),
  message: z.string().optional(),
  code: z.number().or(z.string()).optional(),
  type: z.string().optional(),
  stack: z.string().optional(),
  platformErrorCode: z.number().optional(),
  platformMessage: z.string().optional(),
  platformErrorType: z.string().optional(),
  platformErrors: z.array(z.unknown()).optional(),
  error: z.unknown().optional(),
  rateLimit: z.unknown().optional(),
  data: z.unknown().optional(),
  headers: z.record(z.string()).optional(),
  originalError: z.unknown().optional(),
  request: z.unknown().optional(),
  response: z.unknown().optional(),
  requestError: z.unknown().optional(),
  responseError: z.unknown().optional(),
  rawContent: z.unknown().optional(),
  transactionId: z.string().optional(),
  rawContentSample: z.string().optional(),
}).transform((data) => {
  // Filter out potentially problematic fields
  const { originalError, ...rest } = data;

  // Extract useful information from originalError if it exists
  if (originalError instanceof Error) {
    return {
      ...rest,
      errorName: originalError.name,
      errorStack: originalError.stack,
    };
  }

  return rest;
}).transform((data) => {
  // Sanitize headers to remove sensitive information
  if (data.headers && typeof data.headers === 'object') {
    const sanitizedHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(data.headers)) {
      if (
        key.toLowerCase() !== 'authorization' &&
        key.toLowerCase() !== 'cookie' &&
        !key.toLowerCase().includes('token')
      ) {
        sanitizedHeaders[key] = typeof value === 'string' ? value : String(value);
      }
    }
    data.headers = sanitizedHeaders;
  }

  // Remove undefined values
  return Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined),
  );
});

/**
 * Sanitize error details using Zod schema
 * @param error The error object to sanitize
 * @returns Sanitized error details
 */
export function sanitizeErrorDetails(error: unknown): Record<string, unknown> {
  try {
    // Extract basic properties if it's an Error object
    if (error instanceof Error) {
      const baseDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };

      // Merge with any additional properties
      const fullDetails = {
        ...baseDetails,
        ...(error as unknown as Record<string, unknown>),
      };

      // Parse through the schema
      return ErrorDetailsSchema.parse(fullDetails);
    }

    // For non-Error objects, parse directly
    return ErrorDetailsSchema.parse(error);
  } catch (e) {
    // If parsing fails, return a minimal safe object
    return {
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.name : typeof error,
    };
  }
}
