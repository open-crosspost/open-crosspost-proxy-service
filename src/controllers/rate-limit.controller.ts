import { Context } from '../../deps.ts';
import { RateLimitService } from '../domain/services/rate-limit.service.ts';
import { getEnv } from '../config/env.ts';
import { PlatformName } from '../types/platform.types.ts';

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
      // Get parameters from the request
      const platform = c.req.param('platform') as PlatformName;
      const endpoint = c.req.param('endpoint');
      const version = c.req.query('version');

      // Get the rate limit status
      const status = await this.rateLimitService.getRateLimitStatus(
        platform,
        endpoint,
        version
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
      // Get platform from the request
      const platform = c.req.param('platform') as PlatformName;
      
      // Get all rate limits for the platform
      const limits = await this.rateLimitService.getAllRateLimits(platform);

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
