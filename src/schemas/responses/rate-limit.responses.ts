/**
 * Response schemas for rate limit-related endpoints
 */

import { z } from 'zod';
import { enhancedResponseSchema } from '../zod/index.js';
import { platformSchema } from '../zod/common.schemas.js';

/**
 * Rate limit endpoint schema
 */
export const rateLimitEndpointSchema = z.object({
  endpoint: z.string().describe('API endpoint'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).describe('HTTP method'),
  limit: z.number().describe('Rate limit'),
  remaining: z.number().describe('Remaining requests'),
  reset: z.number().describe('Reset timestamp (Unix timestamp in seconds)'),
  resetDate: z.string().describe('Reset date (ISO string)'),
});

/**
 * Rate limit status response schema
 */
export const rateLimitStatusResponseSchema = enhancedResponseSchema(
  z.object({
    platform: platformSchema,
    userId: z.string().optional().describe('User ID'),
    endpoints: z.array(rateLimitEndpointSchema).describe('Rate limits for specific endpoints'),
    app: z.object({
      limit: z.number().describe('App-wide rate limit'),
      remaining: z.number().describe('Remaining requests'),
      reset: z.number().describe('Reset timestamp (Unix timestamp in seconds)'),
      resetDate: z.string().describe('Reset date (ISO string)'),
    }).optional().describe('App-wide rate limits'),
  }),
);

/**
 * All rate limits response schema
 */
export const allRateLimitsResponseSchema = enhancedResponseSchema(
  z.object({
    platforms: z.record(
      platformSchema,
      z.object({
        users: z.record(
          z.string(),
          z.object({
            endpoints: z.array(rateLimitEndpointSchema).describe('Rate limits for specific endpoints'),
            lastUpdated: z.string().describe('Last updated date (ISO string)'),
          }),
        ).describe('User-specific rate limits'),
        app: z.object({
          limit: z.number().describe('App-wide rate limit'),
          remaining: z.number().describe('Remaining requests'),
          reset: z.number().describe('Reset timestamp (Unix timestamp in seconds)'),
          resetDate: z.string().describe('Reset date (ISO string)'),
        }).optional().describe('App-wide rate limits'),
      }),
    ).describe('Rate limits by platform'),
  }),
);
