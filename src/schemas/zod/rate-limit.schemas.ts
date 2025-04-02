import { z } from '../../../deps.ts';

/**
 * Rate Limit Schemas
 * Defines Zod schemas for rate limit-related requests and responses with OpenAPI metadata
 * Also exports TypeScript types derived from Zod schemas for type safety
 */

// Rate limit endpoint parameter schema
export const RateLimitEndpointParamSchema = z.object({
  endpoint: z.string().optional().openapi({
    description: 'Specific endpoint to get rate limit information for (optional)',
    example: 'post',
  }),
}).openapi('RateLimitEndpointParam');

// Rate limit status schema
export const RateLimitStatusSchema = z.object({
  endpoint: z.string().openapi({
    description: 'API endpoint or action',
    example: 'post',
  }),
  limit: z.number().openapi({
    description: 'Maximum number of requests allowed in the time window',
    example: 10,
  }),
  remaining: z.number().openapi({
    description: 'Number of requests remaining in the current time window',
    example: 5,
  }),
  reset: z.string().datetime().openapi({
    description: 'Timestamp when the rate limit will reset',
    example: '2023-01-01T12:00:00Z',
  }),
  resetSeconds: z.number().openapi({
    description: 'Seconds until the rate limit will reset',
    example: 3600,
  }),
}).openapi('RateLimitStatus');

// Platform-specific rate limit schema
export const PlatformRateLimitSchema = z.object({
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter',
  }),
  endpoints: z.record(z.string(), RateLimitStatusSchema).openapi({
    description: 'Rate limit status for each endpoint',
    example: {
      'post': {
        endpoint: 'post',
        limit: 300,
        remaining: 150,
        reset: '2023-01-01T12:00:00Z',
        resetSeconds: 3600,
      },
      'like': {
        endpoint: 'like',
        limit: 1000,
        remaining: 500,
        reset: '2023-01-01T12:00:00Z',
        resetSeconds: 3600,
      },
    },
  }),
}).openapi('PlatformRateLimit');

// Usage rate limit schema
export const UsageRateLimitSchema = z.object({
  endpoint: z.string().openapi({
    description: 'API endpoint or action',
    example: 'post',
  }),
  limit: z.number().openapi({
    description: 'Maximum number of requests allowed in the time window',
    example: 10,
  }),
  remaining: z.number().openapi({
    description: 'Number of requests remaining in the current time window',
    example: 5,
  }),
  reset: z.string().datetime().openapi({
    description: 'Timestamp when the rate limit will reset',
    example: '2023-01-01T12:00:00Z',
  }),
  resetSeconds: z.number().openapi({
    description: 'Seconds until the rate limit will reset',
    example: 3600,
  }),
  timeWindow: z.string().openapi({
    description: 'Time window for the rate limit',
    example: '24h',
  }),
}).openapi('UsageRateLimit');

// Rate limit response schema
export const RateLimitResponseSchema = z.object({
  platformLimits: z.array(PlatformRateLimitSchema).openapi({
    description: 'Platform-specific rate limits',
  }),
  usageLimits: z.record(z.string(), UsageRateLimitSchema).openapi({
    description: 'Usage-based rate limits for the NEAR account',
    example: {
      'post': {
        endpoint: 'post',
        limit: 10,
        remaining: 5,
        reset: '2023-01-01T12:00:00Z',
        resetSeconds: 3600,
        timeWindow: '24h',
      },
    },
  }),
  signerId: z.string().openapi({
    description: 'NEAR account ID',
    example: 'johndoe.near',
  }),
}).openapi('RateLimitResponse');

// Single endpoint rate limit response schema
export const EndpointRateLimitResponseSchema = z.object({
  platformLimits: z.array(
    z.object({
      platform: z.string().openapi({
        description: 'Social media platform',
        example: 'twitter',
      }),
      status: RateLimitStatusSchema.openapi({
        description: 'Rate limit status for the endpoint',
      }),
    }),
  ).openapi({
    description: 'Platform-specific rate limits for the endpoint',
  }),
  usageLimit: UsageRateLimitSchema.openapi({
    description: 'Usage-based rate limit for the NEAR account',
  }),
  endpoint: z.string().openapi({
    description: 'API endpoint or action',
    example: 'post',
  }),
  signerId: z.string().openapi({
    description: 'NEAR account ID',
    example: 'johndoe.near',
  }),
}).openapi('EndpointRateLimitResponse');

// Export TypeScript types derived from Zod schemas
export type RateLimitEndpointParam = z.infer<typeof RateLimitEndpointParamSchema>;
export type RateLimitStatus = z.infer<typeof RateLimitStatusSchema>;
export type PlatformRateLimit = z.infer<typeof PlatformRateLimitSchema>;
export type UsageRateLimit = z.infer<typeof UsageRateLimitSchema>;
export type RateLimitResponse = z.infer<typeof RateLimitResponseSchema>;
export type EndpointRateLimitResponse = z.infer<typeof EndpointRateLimitResponseSchema>;
