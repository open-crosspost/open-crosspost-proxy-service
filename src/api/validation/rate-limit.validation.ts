import { z } from 'zod';

/**
 * Rate Limit Validation Schemas
 * Defines validation schemas for rate limit-related requests
 */

/**
 * Rate Limit Status Schema
 * Validates the request to get rate limit status
 */
export const RateLimitStatusSchema = z.object({
  endpoint: z.string({
    required_error: 'Endpoint is required',
  }),
  version: z.enum(['v1', 'v2']).default('v2'),
});

/**
 * Rate Limit Check Schema
 * Validates the request to check if a rate limit has been hit
 */
export const RateLimitCheckSchema = z.object({
  rateLimitStatus: z.any({
    required_error: 'Rate limit status is required',
  }),
});

/**
 * Rate Limit Obsolete Schema
 * Validates the request to check if a rate limit status is obsolete
 */
export const RateLimitObsoleteSchema = z.object({
  rateLimitStatus: z.any({
    required_error: 'Rate limit status is required',
  }),
});

/**
 * Rate Limit Headers Schema
 * Defines the structure of rate limit headers
 */
export const RateLimitHeadersSchema = z.object({
  'X-Rate-Limit-Limit': z.string(),
  'X-Rate-Limit-Remaining': z.string(),
  'X-Rate-Limit-Reset': z.string(),
});

/**
 * Twitter Rate Limit Headers Schema
 * Defines the structure of Twitter rate limit headers
 */
export const TwitterRateLimitHeadersSchema = z.object({
  'X-Twitter-Rate-Limit-Limit': z.string(),
  'X-Twitter-Rate-Limit-Remaining': z.string(),
  'X-Twitter-Rate-Limit-Reset': z.string(),
});

/**
 * Rate Limit Status Response Schema
 * Defines the structure of a rate limit status response
 */
export const RateLimitStatusResponseSchema = z.object({
  limit: z.number(),
  remaining: z.number(),
  reset: z.number(),
  endpoint: z.string(),
  version: z.enum(['v1', 'v2']),
});

/**
 * Rate Limit Status Response type
 */
export type RateLimitStatusResponse = z.infer<typeof RateLimitStatusResponseSchema>;
