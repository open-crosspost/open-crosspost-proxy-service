import { Effect } from 'every-plugin/effect';
import { TwitterApi } from 'twitter-api-v2';
import { TwitterApiRateLimitPlugin } from '@twitter-api-v2/plugin-rate-limit';

export class ClientFactory {
  private rateLimitPlugin: TwitterApiRateLimitPlugin;

  constructor(
    private clientId: string,
    private clientSecret: string
  ) {
    this.rateLimitPlugin = new TwitterApiRateLimitPlugin();
  }

  /**
   * Create a Twitter API client for a user with their access token
   * @param accessToken The user's access token
   * @returns Effect that yields a TwitterApi client
   */
  createClient(accessToken: string): Effect.Effect<TwitterApi, Error> {
    return Effect.tryPromise({
      try: async () => {
        const client = new TwitterApi(accessToken, {
          plugins: [this.rateLimitPlugin]
        });

        // Validate the client by making a simple API call
        try {
          await client.v2.me({ 'user.fields': ['id'] });
        } catch (error) {
          throw new Error(`Invalid access token: ${error}`);
        }

        return client;
      },
      catch: (error) => {
        console.error('Error creating Twitter client:', error);
        throw new Error('Failed to create Twitter client with provided access token');
      }
    });
  }

  /**
   * Create an app-only Twitter API client for operations that don't require user tokens
   * @returns Effect that yields a TwitterApi client
   */
  createAppClient(): Effect.Effect<TwitterApi, Error> {
    return Effect.tryPromise({
      try: async () => {
        const client = new TwitterApi({
          clientId: this.clientId,
          clientSecret: this.clientSecret
        });

        return client;
      },
      catch: (error) => {
        console.error('Error creating Twitter app client:', error);
        throw new Error('Failed to create Twitter app client');
      }
    });
  }
}
