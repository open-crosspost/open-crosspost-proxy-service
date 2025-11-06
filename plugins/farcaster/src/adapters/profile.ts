import { Effect } from 'every-plugin/effect';
import { ClientFactory } from '../client-factory';
import * as ProfileSchemas from '@crosspost/platform-contract';
import { mapNeynarError } from '../utils/error-mapping';

export class ProfileAdapter {
  constructor(
    private clientFactory: ClientFactory
  ) {}

  /**
   * Get user profile
   * @param input The input parameters for getting profile
   * @returns The user profile
   */
  get(input: ProfileSchemas.GetProfileInput): Effect.Effect<ProfileSchemas.UserProfile, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient();

      const result = yield* Effect.tryPromise({
        try: async () => {
          // Convert userId (FID) to number
          const fid = parseInt(input.userId, 10);
          if (isNaN(fid)) {
            throw new Error(`Invalid FID: ${input.userId}`);
          }

          const response = await client.fetchBulkUsers({
            fids: [fid],
          });

          // fetchBulkUsers returns an object with 'users' array property
          const users = 'users' in response && Array.isArray(response.users) 
            ? response.users 
            : Array.isArray(response) 
              ? response 
              : [];

          if (!users || users.length === 0 || !users[0]) {
            throw new Error(`User not found: ${input.userId}`);
          }

          const user = users[0];

          return {
            id: String(user.fid),
            username: user.username || '',
            displayName: user.display_name || user.username || '',
            bio: user.profile?.bio?.text || '',
            avatar: user.pfp_url || '',
            verified: user.verified || false,
            followersCount: user.follower_count,
            followingCount: user.following_count,
            postsCount: user.custody_address ? undefined : undefined, // Neynar doesn't provide post count directly
            createdAt: user.created_at ? new Date(user.created_at).toISOString() : undefined,
            url: user.username ? `https://warpcast.com/${user.username}` : undefined,
          };
        },
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      return result;
    });
  }
}
