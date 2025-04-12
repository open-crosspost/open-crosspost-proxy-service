import { PlatformName } from '@crosspost/types';
import { Context } from '../../deps.ts';
import { RateLimitService } from '../domain/services/rate-limit.service.ts';
import { UsageRateLimitMiddleware } from '../middleware/usage-rate-limit.middleware.ts';
import { PrefixedKvStore } from '../utils/kv-store.utils.ts';
import { BaseController } from './base.controller.ts';

/**
 * Rate Limit Controller
 * Handles HTTP requests for rate limit-related operations
 */
export class RateLimitController extends BaseController {
  private rateLimitService: RateLimitService;
  private usageRateLimitKvStore: PrefixedKvStore;

  constructor(
    rateLimitService: RateLimitService,
    usageRateLimitKvStore?: PrefixedKvStore,
  ) {
    super();
    this.rateLimitService = rateLimitService;
    this.usageRateLimitKvStore = usageRateLimitKvStore || new PrefixedKvStore(['usage_rate_limit']);
  }

  /**
   * Get rate limit status for a specific endpoint
   * @param c The Hono context
   * @returns HTTP response
   */
  async getRateLimitStatus(c: Context): Promise<Response> {
    try {
      // Get parameters from the request
      const platform = c.get('platform') as PlatformName;
      const endpoint = c.get('validatedParams')?.endpoint;
      const version = c.req.query('version');

      // Get the rate limit status
      const status = await this.rateLimitService.getRateLimitStatus(
        platform,
        endpoint,
        version,
      );

      // Return the result
      return c.json({ data: status });
    } catch (error) {
      return this.handleError(error, c);
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
      const platform = c.get('platform') as PlatformName;

      // Get all rate limits for the platform
      const limits = await this.rateLimitService.getAllRateLimits(platform);

      // Return the result
      return c.json({ data: limits });
    } catch (error) {
      return this.handleError(error, c);
    }
  }

  /**
   * Get usage rate limit status
   * @param c The Hono context
   * @returns HTTP response
   */
  async getUsageRateLimit(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      // Get endpoint from the request
      const endpoint = c.get('validatedParams')?.endpoint || 'post';

      // Get the current configuration
      const config = UsageRateLimitMiddleware.getConfig();

      // Get the start of the current day
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);

      // Calculate next reset time (start of next day)
      const nextDay = new Date(dayStart);
      nextDay.setDate(nextDay.getDate() + 1);
      const resetTime = nextDay.getTime();

      // Get current rate limit record
      const key = [signerId, endpoint];
      const record = await this.usageRateLimitKvStore.get<{
        signerId: string;
        endpoint: string;
        count: number;
        resetTimestamp: number;
      }>(key);

      // If no record exists, create a default response
      if (!record) {
        return c.json({
          data: {
            signerId,
            endpoint,
            limit: config.maxPostsPerDay,
            remaining: config.maxPostsPerDay,
            reset: Math.floor(resetTime / 1000),
          },
        });
      }

      // Return the rate limit status
      return c.json({
        data: {
          signerId,
          endpoint,
          limit: config.maxPostsPerDay,
          remaining: Math.max(0, config.maxPostsPerDay - record.count),
          reset: Math.floor(resetTime / 1000),
        },
      });
    } catch (error) {
      return this.handleError(error, c);
    }
  }
}
