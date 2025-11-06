import { Effect } from 'every-plugin/effect';
import * as RateLimitSchemas from '@crosspost/platform-contract';

export class RateLimitAdapter {
  /**
   * Check rate limit status for an endpoint
   * Farcaster/Neynar doesn't expose rate limits via API, so we return unlimited
   * @param input The input parameters for checking rate limit
   * @returns The rate limit status (always unlimited)
   */
  check(input: RateLimitSchemas.CheckRateLimitInput): Effect.Effect<RateLimitSchemas.RateLimitStatus, Error> {
    return Effect.succeed({
      limit: Number.MAX_SAFE_INTEGER,
      remaining: Number.MAX_SAFE_INTEGER,
      reset: Math.floor(Date.now() / 1000),
      resetAfter: 0,
    });
  }
}
