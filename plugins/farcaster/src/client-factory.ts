import { Effect } from 'every-plugin/effect';
import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { mapNeynarError } from './utils/error-mapping';

export class ClientFactory {
  constructor(
    private neynarApiKey: string
  ) {}

  /**
   * Create a Neynar API client instance
   * @returns Effect that yields a NeynarAPIClient
   */
  createClient(): Effect.Effect<NeynarAPIClient, Error> {
    return Effect.tryPromise({
      try: async () => {
        const client = new NeynarAPIClient(
          new Configuration({ apiKey: this.neynarApiKey })
        );
        return client;
      },
      catch: (error) => {
        throw mapNeynarError(error);
      }
    });
  }
}
