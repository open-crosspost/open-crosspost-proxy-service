import { Effect } from 'every-plugin/effect';
import { TwitterApiRateLimitPlugin } from '@twitter-api-v2/plugin-rate-limit';
import { ClientFactory } from '../client-factory';
import * as RateLimitSchemas from '@crosspost/platform-contract';

export class RateLimitAdapter {
  private rateLimitPlugin: TwitterApiRateLimitPlugin;

  constructor(
    private clientFactory: ClientFactory
  ) {
    this.rateLimitPlugin = new TwitterApiRateLimitPlugin();
  }

  /**
   * Check rate limit status for an endpoint
   * @param input The input parameters for checking rate limit
   * @returns The rate limit status
   */
  check(input: RateLimitSchemas.CheckRateLimitInput): Effect.Effect<RateLimitSchemas.RateLimitStatus, Error> {
    const self = this;
    return Effect.gen(function* () {
      // Rate limit checking doesn't require authentication
      const client = yield* self.clientFactory.createAppClient();

      const result = yield* Effect.tryPromise({
        try: async () => {
          // Map common endpoints to their rate limit paths
          const endpointMap: Record<string, string> = {
            'posts': '/2/tweets',
            'likes': '/2/users/:id/likes',
            'retweets': '/2/users/:id/retweets',
            'media': 'media/upload',
            'users': '/2/users/me',
            'timeline': '/2/users/:id/tweets',
          };

          const rateLimitPath = endpointMap[input.endpoint] || input.endpoint;
          const rateLimitData = await self.rateLimitPlugin.v2.getRateLimit(rateLimitPath);

          if (!rateLimitData) {
            return {
              limit: 0,
              remaining: 0,
              reset: Date.now() / 1000,
              resetAfter: 0,
            };
          }

          const now = Date.now() / 1000;
          const resetAfter = Math.max(0, rateLimitData.reset - now);

          return {
            limit: rateLimitData.limit,
            remaining: rateLimitData.remaining,
            reset: rateLimitData.reset,
            resetAfter,
          };
        },
        catch: (error) => {
          console.error('Error checking rate limit:', error);
          throw new Error('Failed to check rate limit');
        }
      });

      return result;
    });
  }
}
