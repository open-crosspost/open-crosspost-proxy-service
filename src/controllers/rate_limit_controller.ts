import { Context } from '../../deps.ts';
import { RateLimitService } from '../domain/services/rate-limit.service.ts';
import { getEnv } from '../config/env.ts';

/**
 * Rate Limit Controller
 * Handles HTTP requests for rate limit-related operations
 */
export class RateLimitController {
  private rateLimitService: RateLimitService;

  constructor() {
    const env = getEnv();
    this.rateLimitService = new RateLimitService(env);
  }

  /**
   * Get rate limit status for a specific endpoint
   * @param c The Hono context
   * @returns HTTP response
   */
  async getRateLimitStatus(c: Context): Promise<Response> {
    try {
      // Extract user ID from context
      const userId = c.get('userId') as string;

      // Get the endpoint from the URL
      const endpoint = c.req.param('endpoint');

      // Get the rate limit status
      const status = await this.rateLimitService.getRateLimitStatus(
        userId,
        endpoint as 'v1' | 'v2' | undefined,
      );

      // Return the result
      return c.json({ data: status });
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }

  /**
   * Get all rate limits
   * @param c The Hono context
   * @returns HTTP response
   */
  async getAllRateLimits(c: Context): Promise<Response> {
    try {
      // Extract user ID from context
      const userId = c.get('userId') as string;

      // Get all rate limits
      const limits = await this.rateLimitService.getAllRateLimits();

      // Return the result
      return c.json({ data: limits });
    } catch (error) {
      console.error('Error getting all rate limits:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }
}
