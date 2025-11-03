import { z } from 'every-plugin/zod';

/**
 * Check rate limit input schema
 */
export const CheckRateLimitInputSchema = z.object({
  endpoint: z.string().describe('API endpoint to check rate limit for'),
});
export type CheckRateLimitInput = z.infer<typeof CheckRateLimitInputSchema>;

/**
 * Rate limit status schema
 */
export const RateLimitStatusSchema = z.object({
  limit: z.number().describe('Rate limit'),
  remaining: z.number().describe('Remaining requests'),
  reset: z.number().describe('Reset timestamp'),
  resetAfter: z.number().describe('Seconds until reset'),
}).describe('Rate limit status');
export type RateLimitStatus = z.infer<typeof RateLimitStatusSchema>;
