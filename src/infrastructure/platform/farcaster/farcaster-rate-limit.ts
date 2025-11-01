import { RateLimitStatus } from '@crosspost/types';
import { PlatformRateLimit } from '../abstract/platform-rate-limit.interface.ts';

/**
 * FarcasterRateLimit
 * No-op implementation: Farcaster/Neynar do not expose rate limits,
 * so we treat all actions as unlimited.
 */
export class FarcasterRateLimit implements PlatformRateLimit {
  private readonly actionEndpointMap: Record<string, { endpoint: string; version?: string }>;

  constructor(actionEndpointMap?: Record<string, { endpoint: string; version?: string }>) {
    // Map common actions to their corresponding endpoints
    this.actionEndpointMap = actionEndpointMap ?? {
      post: { endpoint: '/casts' },
      like: { endpoint: '/reactions' },
      recast: { endpoint: '/recasts' },
      user: { endpoint: '/users' },
      feed: { endpoint: '/feed' },
    };
  }

  /**
   * Get the rate limit status for a specific endpoint
   * @param endpoint The endpoint to check rate limits for
   * @param version The API version (v1 or v2)
   * @returns The rate limit status
   */
  async getRateLimitStatus(endpoint: string, _version?: string): Promise<RateLimitStatus> {
    const unlimited = Number.MAX_SAFE_INTEGER;
    return {
      limit: unlimited,
      remaining: unlimited,
      reset: new Date().toISOString(),
      endpoint,
      resetSeconds: 0,
    };
  }

  /**
   * Check if a rate limit has been hit
   * @param rateLimitStatus The rate limit status object
   * @returns True if the rate limit has been hit
   */
  isRateLimited(_rateLimitStatus: RateLimitStatus | null): boolean {
    return false;
  }

  /**
   * Check if a rate limit status is obsolete (reset time has passed)
   * @param rateLimitStatus The rate limit status object
   * @returns True if the rate limit status is obsolete
   */
  isRateLimitObsolete(_rateLimitStatus: RateLimitStatus | null): boolean {
    return false;
  }

  /**
   * Get all rate limit statuses
   * @returns All rate limit statuses
   */
  async getAllRateLimits(): Promise<Record<string, RateLimitStatus>> {
    return {};
  }

  /**
   * Get the endpoint for a specific action
   * @param action The action to get the endpoint for (e.g., 'post', 'like')
   * @returns The endpoint and version
   */
  getEndpointForAction(action: string): { endpoint: string; version?: string } | null {
    return this.actionEndpointMap[action] ?? null;
  }
}
