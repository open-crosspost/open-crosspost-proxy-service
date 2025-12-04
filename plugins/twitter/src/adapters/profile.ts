import { Effect } from 'every-plugin/effect';
import { ClientFactory } from '../client-factory';
import * as ProfileSchemas from '@crosspost/platform-contract';

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
      const client = yield* self.clientFactory.createClient(input.accessToken);

      const result = yield* Effect.tryPromise({
        try: async () => {
          const { data: user } = await client.v2.user(input.userId, {
            'user.fields': [
              'profile_image_url',
              'username',
              'name',
              'description',
              'verified',
              'public_metrics',
              'created_at'
            ],
          });

          return {
            id: user.id,
            username: user.username,
            displayName: user.name,
            bio: user.description,
            avatar: user.profile_image_url,
            verified: user.verified,
            followersCount: user.public_metrics?.followers_count,
            followingCount: user.public_metrics?.following_count,
            postsCount: user.public_metrics?.tweet_count,
            createdAt: user.created_at,
          };
        },
        catch: (error) => {
          console.error('Error getting user profile:', error);
          throw new Error('Failed to get user profile');
        }
      });

      return result;
    });
  }
}
