import { ApiErrorCode, Platform, UserProfile } from '@crosspost/types';
import { TwitterApi } from 'twitter-api-v2';
import { TwitterError } from './twitter-error.ts';
import { UserProfileStorage } from '../../storage/user-profile-storage.ts';
import { PlatformProfile } from '../abstract/platform-profile.interface.ts';
import { TwitterClient } from './twitter-client.ts';

export class TwitterProfile implements PlatformProfile {
  constructor(
    private twitterClient: TwitterClient,
    private profileStorage: UserProfileStorage,
  ) { }

  /**
   * Get a user's profile, fetching from the API if needed
   * @param userId The user ID to get the profile for
   * @param forceRefresh Whether to force a refresh from the API
   * @returns The user profile or null if not found
   */
  async getUserProfile(userId: string, forceRefresh = false): Promise<UserProfile | null> {
    try {
      // Get the profile from storage
      const profile = await this.profileStorage.getProfile(userId, Platform.TWITTER);

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
    providedClient?: TwitterApi,
  ): Promise<UserProfile | null> {
    try {
      let client: TwitterApi | null;

      if (isInitialAuth && providedClient) {
        client = providedClient;
      } else {
        client = await this.twitterClient.getClientForUser(userId);
      }

      // If client is null, it means token refresh failed or no valid tokens were found.
      if (!client) {
        console.warn(`TwitterProfile: Could not obtain a valid Twitter client for user ${userId}. Profile fetch aborted.`);
        return null;
      }

      const { data: user, errors } = await client.v2.user(userId, {
        'user.fields': 'profile_image_url,username,url,verified',
      });

      if (errors || !user) {
        console.error(`TwitterProfile: Twitter API returned errors or no user data for ${userId}:`, errors);

        return null;
      }

      const profile = this.createUserProfile(user);
      await this.profileStorage.saveProfile(profile);
      return profile;

    } catch (error: unknown) {
      console.error(`TwitterProfile: Error fetching user profile for ${userId} (outer catch):`, error);
      // It's possible an error from client.v2.user() could land here if not an API error in `errors` field.
      const processedError = TwitterError.fromTwitterApiError(error);

      if (processedError.code === ApiErrorCode.UNAUTHORIZED) {
        console.warn(`TwitterProfile: Caught auth-related error (code: ${processedError.code}) for ${userId}. Deleting tokens via TwitterClient.`);
        try {
          await this.twitterClient.deleteTokensOnAuthError(userId);
        } catch (deleteErr) {
          console.error(`TwitterProfile: Error calling deleteTokensOnAuthError for ${userId}:`, deleteErr);
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
  private createUserProfile(user: any): UserProfile {
    const profile: UserProfile = {
      userId: user.id,
      username: user.username,
      profileImageUrl: user.profile_image_url || '',
      isPremium: user.verified || false, // Use verified as a proxy for premium status
      platform: Platform.TWITTER,
      lastUpdated: Date.now(),
    };

    // Add URL if provided, otherwise generate it for Twitter
    if (user.url) {
      profile.url = user.url;
    } else {
      profile.url = `https://x.com/${user.username}`;
    }

    return profile;
  }
}
