import { ApiErrorCode, Platform, UserProfile } from '@crosspost/types';
import { FarcasterError } from './farcaster-error.ts';
import { UserProfileStorage } from '../../storage/user-profile-storage.ts';
import { PlatformProfile } from '../abstract/platform-profile.interface.ts';
import { FarcasterClient } from './farcaster-client.ts';
import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import { User } from '@neynar/nodejs-sdk/build/api/index.ts';

export class FarcasterProfile implements PlatformProfile {
  constructor(
    private farcasterClient: FarcasterClient,
    private profileStorage: UserProfileStorage,
  ) {}

  /**
   * Get a user's profile, fetching from the API if needed
   * @param userId The user ID to get the profile for
   * @param forceRefresh Whether to force a refresh from the API
   * @returns The user profile or null if not found
   */
  async getUserProfile(userId: string, forceRefresh = false): Promise<UserProfile | null> {
    try {
      // Get the profile from storage
      const profile = await this.profileStorage.getProfile(userId, Platform.FARCASTER);

      // Check if we need to refresh the profile
      if (forceRefresh || this.profileStorage.needsRefresh(profile)) {
        return await this.fetchUserProfile(userId);
      }

      return profile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Fetch a user's profile from the Twitter API
   * @param userId The user ID to fetch the profile for
   * @param isInitialAuth Whether this is being called during initial authentication
   * @param providedClient Optional Twitter client to use (for initial auth)
   * @returns The user profile or null if not found
   */
  async fetchUserProfile(
    userId: string,
    isInitialAuth = false,
    providedClient?: NeynarAPIClient,
  ): Promise<UserProfile | null> {
    try {
      let client: NeynarAPIClient | null;

      if (isInitialAuth && providedClient) {
        client = providedClient;
      } else {
        client = await this.farcasterClient.getClientForUser();
      }

      // If client is null, it means token refresh failed or no valid tokens were found.
      if (!client) {
        console.warn(
          `FarcasterProfile: Could not obtain a valid Farcaster client for user ${userId}. Profile fetch aborted.`,
        );
        return null;
      }

      const users = await client.fetchBulkUsers({
        fids: [parseInt(userId)],
      });

      const profile = this.createUserProfile(users[0]);
      await this.profileStorage.saveProfile(profile);
      return profile;
    } catch (error: unknown) {
      console.error(
        `FarcasterProfile: Error fetching user profile for ${userId} (outer catch):`,
        error,
      );
      // It's possible an error from client.v2.user() could land here if not an API error in `errors` field.
      const processedError = FarcasterError.fromNeynarError(error);

      if (processedError.code === ApiErrorCode.UNAUTHORIZED) {
        console.warn(
          `FarcasterProfile: Caught auth-related error (code: ${processedError.code}) for ${userId}. Deleting tokens via FarcasterClient.`,
        );
        try {
          await this.farcasterClient.deleteTokensOnAuthError(userId);
        } catch (deleteErr) {
          console.error(
            `FarcasterProfile: Error calling deleteTokensOnAuthError for ${userId}:`,
            deleteErr,
          );
        }
      }
      return null;
    }
  }

  /**
   * Create a user profile object from Twitter API user data
   * @param user Twitter API user data
   * @returns User profile object
   */
  private createUserProfile(user: User): UserProfile {
    const profile: UserProfile = {
      userId: String(user.fid),
      username: user.username,
      profileImageUrl: user.pfp_url || '',
      isPremium: false, // Use verified as a proxy for premium status
      platform: Platform.FARCASTER,
      lastUpdated: Date.now(),
    };

    // Add URL if provided, otherwise generate it for Twitter
    if (user) {
      profile.url = `https://farcaster.xyz/${user.username}`;
    }

    return profile;
  }
}
