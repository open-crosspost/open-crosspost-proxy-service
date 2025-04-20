import { RateLimitStatus } from '@crosspost/types';
import { TwitterApiRateLimitPlugin } from '@twitter-api-v2/plugin-rate-limit';
import type { TwitterRateLimit as TwitterApiRateLimit } from 'twitter-api-v2';
import { PlatformRateLimit } from '../abstract/platform-rate-limit.interface.ts';
import { TwitterError } from './twitter-error.ts';

export class TwitterRateLimit implements PlatformRateLimit {
  private rateLimitPlugin: TwitterApiRateLimitPlugin;
  private actionEndpointMap: Record<string, { endpoint: string; version: 'v1' | 'v2' }>;

  constructor() {
    this.rateLimitPlugin = new TwitterApiRateLimitPlugin();

    // Map common actions to their corresponding endpoints
    this.actionEndpointMap = {
      post: { endpoint: '/2/tweets', version: 'v2' },
      like: { endpoint: '/2/users/:id/likes', version: 'v2' },
      retweet: { endpoint: '/2/users/:id/retweets', version: 'v2' },
      media: { endpoint: 'media/upload', version: 'v1' },
      user: { endpoint: '/2/users/me', version: 'v2' },
      timeline: { endpoint: '/2/users/:id/tweets', version: 'v2' },
    };
  }

  /**
   * Get the rate limit status for a specific endpoint
   * @param endpoint The endpoint to check rate limits for
   * @param version The API version (v1 or v2)
   * @returns The rate limit status
   */
  async getRateLimitStatus(
    endpoint: string,
    version: 'v1' | 'v2' = 'v2',
  ): Promise<RateLimitStatus> {
    try {
      const rateLimitData = await this.rateLimitPlugin[version].getRateLimit(endpoint);

      if (!rateLimitData) {
        // Return a default rate limit status when no data is available
        return {
          limit: 0,
          remaining: 0,
          reset: new Date().toISOString(),
          endpoint,
          resetSeconds: 0,
        };
      }

      // Calculate resetSeconds from reset timestamp
      const resetDate = new Date(rateLimitData.reset * 1000);
      const now = new Date();
      const resetSeconds = Math.max(0, Math.floor((resetDate.getTime() - now.getTime()) / 1000));

      return {
        limit: rateLimitData.limit,
        remaining: rateLimitData.remaining,
        reset: resetDate.toISOString(), // Convert to ISO string as required by RateLimitStatus
        endpoint,
        resetSeconds,
      };
    } catch (error) {
      console.error('Error getting Twitter rate limit status:', error);
      throw TwitterError.fromTwitterApiError(error);
    }
  }

  /**
   * Check if a rate limit has been hit
   * @param rateLimitStatus The rate limit status object
   * @returns True if the rate limit has been hit
   */
  isRateLimited(rateLimitStatus: RateLimitStatus): boolean {
    // Convert our rate limit format to Twitter's format
    const twitterRateLimit: TwitterApiRateLimit = {
      limit: rateLimitStatus.limit,
      remaining: rateLimitStatus.remaining,
      reset: Math.floor(new Date(rateLimitStatus.reset).getTime() / 1000),
    };
    return this.rateLimitPlugin.hasHitRateLimit(twitterRateLimit);
  }

  /**
   * Check if a rate limit status is obsolete (reset time has passed)
   * @param rateLimitStatus The rate limit status object
   * @returns True if the rate limit status is obsolete
   */
  isRateLimitObsolete(rateLimitStatus: RateLimitStatus): boolean {
    // Convert our rate limit format to Twitter's format
    const twitterRateLimit: TwitterApiRateLimit = {
      limit: rateLimitStatus.limit,
      remaining: rateLimitStatus.remaining,
      reset: Math.floor(new Date(rateLimitStatus.reset).getTime() / 1000),
    };
    return this.rateLimitPlugin.isRateLimitStatusObsolete(twitterRateLimit);
  }

  /**
   * Get all rate limit statuses
   * @returns All rate limit statuses
   */
  async getAllRateLimits(): Promise<Record<string, RateLimitStatus>> {
    try {
      // Common endpoints to check
      const endpoints = {
        v2: [
          '/2/tweets',
          '/2/users/me',
          '/2/users/:id/tweets',
          '/2/users/:id/likes',
          '/2/users/:id/retweets',
        ],
        v1: [
          'statuses/update',
          'statuses/retweet/:id',
          'favorites/create',
          'favorites/destroy',
          'media/upload',
        ],
      };

      const rateLimits: Record<string, RateLimitStatus> = {};

      // Get rate limits for v2 endpoints
      for (const endpoint of endpoints.v2) {
        const status = await this.getRateLimitStatus(endpoint, 'v2');
        rateLimits[`v2:${endpoint}`] = status;
      }

      // Get rate limits for v1 endpoints
      for (const endpoint of endpoints.v1) {
        const status = await this.getRateLimitStatus(endpoint, 'v1');
        rateLimits[`v1:${endpoint}`] = status;
      }

      return rateLimits;
    } catch (error) {
      console.error('Error getting all Twitter rate limits:', error);
      throw TwitterError.fromTwitterApiError(error);
    }
  }

  /**
   * Get the endpoint for a specific action
   * @param action The action to get the endpoint for (e.g., 'post', 'like')
   * @returns The endpoint and version
   */
  getEndpointForAction(action: string): { endpoint: string; version: 'v1' | 'v2' } | null {
    return this.actionEndpointMap[action] || null;
  }
}
