import { Env } from '../../config/env.ts';
import { UserProfile } from '../../types/user-profile.types.ts';

/**
 * User Profile Storage using Deno KV
 * Handles storage and retrieval of user profiles
 */
export class UserProfileStorage {
  private kv: Deno.Kv | null = null;
  private readonly CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  constructor(private env: Env) {}

  /**
   * Initialize the KV store
   */
  private async initialize(): Promise<void> {
    if (!this.kv) {
      this.kv = await Deno.openKv();
    }
  }

  /**
   * Get a user profile
   * @param userId The user ID
   * @param platform The platform name (e.g., 'twitter')
   * @returns The user profile or null if not found
   */
  async getProfile(userId: string, platform: string): Promise<UserProfile | null> {
    try {
      await this.initialize();

      if (!this.kv) {
        throw new Error('KV store not initialized');
      }

      // Get the profile from KV
      const key = ['profile', platform, userId];
      const result = await this.kv.get<UserProfile>(key);

      return result.value;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Save a user profile
   * @param profile The user profile to save
   * @returns True if the profile was saved successfully
   */
  async saveProfile(profile: UserProfile): Promise<boolean> {
    try {
      await this.initialize();

      if (!this.kv) {
        throw new Error('KV store not initialized');
      }

      // Set the last updated timestamp
      profile.lastUpdated = Date.now();

      // Save the profile to KV
      const key = ['profile', profile.platform, profile.userId];
      const result = await this.kv.set(key, profile);

      return result.ok;
    } catch (error) {
      console.error('Error saving user profile:', error);
      return false;
    }
  }

  /**
   * Delete a user profile
   * @param userId The user ID
   * @param platform The platform name (e.g., 'twitter')
   * @returns True if the profile was deleted successfully
   */
  async deleteProfile(userId: string, platform: string): Promise<boolean> {
    try {
      await this.initialize();

      if (!this.kv) {
        throw new Error('KV store not initialized');
      }

      // Delete the profile from KV
      const key = ['profile', platform, userId];
      await this.kv.delete(key);

      return true;
    } catch (error) {
      console.error('Error deleting user profile:', error);
      return false;
    }
  }

  /**
   * Check if a profile needs to be refreshed
   * @param profile The user profile to check
   * @returns True if the profile needs to be refreshed
   */
  needsRefresh(profile: UserProfile | null): boolean {
    if (!profile || !profile.lastUpdated) {
      return true;
    }

    const now = Date.now();
    return now - profile.lastUpdated > this.CACHE_DURATION_MS;
  }
}
