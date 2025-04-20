import {
  AccountActivity,
  AccountActivityEntry,
  AccountPost,
  ApiErrorCode,
  Platform,
  PlatformAccountActivity,
  PlatformName,
  PostRecord,
  TimePeriod,
} from '@crosspost/types';
import { Env } from '../../config/env.ts';
import { createApiError } from '../../errors/api-error.ts';
import { createPlatformError } from '../../errors/platform-error.ts';
import { PrefixedKvStore } from '../../utils/kv-store.utils.ts';

/**
 * Activity Tracking Service
 * Tracks NEAR account activity and provides leaderboard functionality
 */
export class ActivityTrackingService {
  private readonly MAX_POSTS_PER_ACCOUNT = 100; // Maximum number of posts to store per account
  private readonly LEADERBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Creates an instance of ActivityTrackingService with dependency injection
   * @param env Environment configuration
   * @param kvStore KV store for activity data
   */
  constructor(private env: Env, private kvStore: PrefixedKvStore) {}

  /**
   * Track a post for a NEAR account
   * @param signerId NEAR account ID
   * @param platform Platform name
   * @param userId User ID on the platform
   * @param postId Post ID
   */
  async trackPost(
    signerId: string,
    platform: PlatformName,
    userId: string,
    postId: string,
  ): Promise<void> {
    try {
      const now = Date.now();

      // Update account activity record
      await this.updateAccountActivity(signerId, now);

      // Update platform-specific account activity record
      await this.updatePlatformAccountActivity(signerId, platform, now);

      // Update post list
      await this.updateAccountPosts(signerId, platform, userId, postId, now);

      // Invalidate leaderboard cache
      await this.invalidateLeaderboardCache();
      await this.invalidatePlatformLeaderboardCache(platform);
    } catch (error) {
      console.error('Error tracking post:', error);
      throw createPlatformError(
        ApiErrorCode.INTERNAL_ERROR,
        'Failed to track post activity',
        platform,
      );
    }
  }

  /**
   * Update account activity record
   * @param signerId NEAR account ID
   * @param timestamp Timestamp of the post
   */
  private async updateAccountActivity(signerId: string, timestamp: number): Promise<void> {
    const key = ['near_account', signerId];
    const activity = await this.kvStore.get<AccountActivity>(key) || {
      signerId,
      postCount: 0,
      firstPostTimestamp: timestamp,
      lastPostTimestamp: timestamp,
    };

    // Update activity data
    activity.postCount += 1;
    if (!activity.firstPostTimestamp) {
      activity.firstPostTimestamp = timestamp;
    }
    activity.lastPostTimestamp = timestamp;

    // Save updated activity
    await this.kvStore.set(key, activity);
  }

  /**
   * Update platform-specific account activity record
   * @param signerId NEAR account ID
   * @param platform Platform name
   * @param timestamp Timestamp of the post
   */
  private async updatePlatformAccountActivity(
    signerId: string,
    platform: PlatformName,
    timestamp: number,
  ): Promise<void> {
    const key = ['near_account_platform', signerId, platform];
    const activity = await this.kvStore.get<PlatformAccountActivity>(key) || {
      signerId,
      platform,
      postCount: 0,
      firstPostTimestamp: timestamp,
      lastPostTimestamp: timestamp,
    };

    // Update activity data
    activity.postCount += 1;
    if (!activity.firstPostTimestamp) {
      activity.firstPostTimestamp = timestamp;
    }
    activity.lastPostTimestamp = timestamp;

    // Save updated activity
    await this.kvStore.set(key, activity);
  }

  /**
   * Update account posts list
   * @param signerId NEAR account ID
   * @param platform Platform name
   * @param userId User ID on the platform
   * @param postId Post ID
   * @param timestamp Timestamp of the post
   */
  private async updateAccountPosts(
    signerId: string,
    platform: PlatformName,
    userId: string,
    postId: string,
    timestamp: number,
  ): Promise<void> {
    const key = ['near_account_posts', signerId];
    const posts = await this.kvStore.get<PostRecord[]>(key) || [];

    // Add new post at the beginning of the array
    posts.unshift({
      id: postId,
      p: platform,
      t: timestamp,
      u: userId,
    });

    // Limit the number of posts stored
    const limitedPosts = posts.slice(0, this.MAX_POSTS_PER_ACCOUNT);

    // Save updated posts
    await this.kvStore.set(key, limitedPosts);
  }

  /**
   * Invalidate leaderboard cache
   */
  private async invalidateLeaderboardCache(): Promise<void> {
    const cacheKeys = [
      ['leaderboard_cache', TimePeriod.ALL],
      ['leaderboard_cache', TimePeriod.YEARLY],
      ['leaderboard_cache', TimePeriod.MONTHLY],
      ['leaderboard_cache', TimePeriod.WEEKLY],
      ['leaderboard_cache', TimePeriod.DAILY],
    ];

    for (const key of cacheKeys) {
      await this.kvStore.delete(key);
    }
  }

  /**
   * Invalidate platform-specific leaderboard cache
   * @param platform Platform name
   */
  private async invalidatePlatformLeaderboardCache(platform: PlatformName): Promise<void> {
    const cacheKeys = [
      ['leaderboard_cache_platform', platform, TimePeriod.ALL],
      ['leaderboard_cache_platform', platform, TimePeriod.YEARLY],
      ['leaderboard_cache_platform', platform, TimePeriod.MONTHLY],
      ['leaderboard_cache_platform', platform, TimePeriod.WEEKLY],
      ['leaderboard_cache_platform', platform, TimePeriod.DAILY],
    ];

    for (const key of cacheKeys) {
      await this.kvStore.delete(key);
    }
  }

  /**
   * Get account activity
   * @param signerId NEAR account ID
   * @returns Account activity data or null if not found
   */
  async getAccountActivity(signerId: string): Promise<AccountActivity | null> {
    try {
      const key = ['near_account', signerId];
      return await this.kvStore.get<AccountActivity>(key);
    } catch (error) {
      console.error('Error getting account activity:', error);
      throw createApiError(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to get account activity for ${signerId}`,
      );
    }
  }

  /**
   * Get platform-specific account activity
   * @param signerId NEAR account ID
   * @param platform Platform name
   * @returns Platform-specific account activity data or null if not found
   */
  async getPlatformAccountActivity(
    signerId: string,
    platform: PlatformName,
  ): Promise<PlatformAccountActivity | null> {
    try {
      const key = ['near_account_platform', signerId, platform];
      return await this.kvStore.get<PlatformAccountActivity>(key);
    } catch (error) {
      console.error('Error getting platform account activity:', error);
      throw createPlatformError(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to get platform account activity for ${signerId} on ${platform}`,
        platform,
      );
    }
  }

  /**
   * Get account posts
   * @param signerId NEAR account ID
   * @param limit Maximum number of posts to return
   * @param offset Number of posts to skip
   * @returns Array of post records
   */
  async getAccountPosts(
    signerId: string,
    limit = 10,
    offset = 0,
  ): Promise<AccountPost[]> {
    try {
      const key = ['near_account_posts', signerId];
      const posts = await this.kvStore.get<PostRecord[]>(key) || [];

      // Apply pagination
      const paginatedPosts = posts.slice(offset, offset + limit);

      // Convert to AccountPost format
      return paginatedPosts.map((post) => ({
        id: post.id,
        platform: post.p as Platform,
        type: 'post', // Default type since we don't track this yet
        createdAt: new Date(post.t).toISOString(),
      }));
    } catch (error) {
      console.error('Error getting account posts:', error);
      throw createApiError(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to get account posts for ${signerId}`,
      );
    }
  }

  /**
   * Get account posts for a specific platform
   * @param signerId NEAR account ID
   * @param platform Platform name
   * @param limit Maximum number of posts to return
   * @param offset Number of posts to skip
   * @returns Array of post records
   */
  async getAccountPlatformPosts(
    signerId: string,
    platform: PlatformName,
    limit = 10,
    offset = 0,
  ): Promise<AccountPost[]> {
    try {
      const key = ['near_account_posts', signerId];
      const posts = await this.kvStore.get<PostRecord[]>(key) || [];

      // Filter by platform
      const platformPosts = posts.filter((post) => post.p === platform);

      // Apply pagination
      const paginatedPosts = platformPosts.slice(offset, offset + limit);

      // Convert to AccountPost format
      return paginatedPosts.map((post) => ({
        id: post.id,
        platform: post.p as Platform,
        type: 'post', // Default type since we don't track this yet
        createdAt: new Date(post.t).toISOString(),
      }));
    } catch (error) {
      console.error('Error getting account platform posts:', error);
      throw createPlatformError(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to get account posts for ${signerId} on ${platform}`,
        platform,
      );
    }
  }

  /**
   * Get the start timestamp for a time period
   * @param timePeriod Time period
   * @returns Start timestamp
   */
  private getTimePeriodStart(timePeriod: TimePeriod): number {
    const now = new Date();

    switch (timePeriod) {
      case TimePeriod.ALL:
        return 0; // Beginning of time

      case TimePeriod.YEARLY:
        return new Date(now.getFullYear(), 0, 1).getTime();

      case TimePeriod.MONTHLY:
        return new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      case TimePeriod.WEEKLY: {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        return new Date(now.getFullYear(), now.getMonth(), diff).getTime();
      }

      case TimePeriod.DAILY:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      default:
        return 0;
    }
  }

  /**
   * Get leaderboard
   * @param limit Maximum number of entries to return
   * @param offset Number of entries to skip
   * @param timePeriod Time period for filtering
   * @returns Array of leaderboard entries
   */
  async getLeaderboard(
    limit = 10,
    offset = 0,
    timePeriod: TimePeriod = TimePeriod.ALL,
  ): Promise<AccountActivityEntry[]> {
    try {
      // Try to get from cache first
      const cacheKey = ['leaderboard_cache', timePeriod];
      const cachedLeaderboard = await this.kvStore.get<{
        entries: AccountActivityEntry[];
        timestamp: number;
      }>(cacheKey);

      // If cache is valid, use it
      if (
        cachedLeaderboard &&
        Date.now() - cachedLeaderboard.timestamp < this.LEADERBOARD_CACHE_TTL
      ) {
        return cachedLeaderboard.entries.slice(offset, offset + limit);
      }

      // Otherwise, generate the leaderboard
      const accounts = await this.kvStore.list<AccountActivity>(['near_account']);
      const timePeriodStart = this.getTimePeriodStart(timePeriod);

      // Filter accounts by time period
      const filteredAccounts = accounts
        .filter((account) => account.value.lastPostTimestamp >= timePeriodStart)
        .map((account) => account.value);

      // Sort by post count (descending)
      const sortedAccounts = filteredAccounts.sort((a, b) => b.postCount - a.postCount);

      // Cache the result
      await this.kvStore.set(cacheKey, {
        entries: sortedAccounts,
        timestamp: Date.now(),
      });

      return sortedAccounts.slice(offset, offset + limit).map((entry, index) => ({
        signerId: entry.signerId,
        totalPosts: entry.postCount,
        totalLikes: 0, // These metrics are not tracked yet
        totalReposts: 0,
        totalReplies: 0,
        totalQuotes: 0,
        totalScore: entry.postCount, // Currently score is just post count
        rank: offset + index + 1,
        lastActive: new Date(entry.lastPostTimestamp).toISOString(),
      }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw createApiError(ApiErrorCode.INTERNAL_ERROR, 'Failed to get leaderboard.');
    }
  }

  /**
   * Get platform-specific leaderboard
   * @param platform Platform name
   * @param limit Maximum number of entries to return
   * @param offset Number of entries to skip
   * @param timePeriod Time period for filtering
   * @returns Array of platform-specific leaderboard entries
   */
  async getPlatformLeaderboard(
    platform: PlatformName,
    limit = 10,
    offset = 0,
    timePeriod: TimePeriod = TimePeriod.ALL,
  ): Promise<AccountActivityEntry[]> {
    try {
      // Try to get from cache first
      const cacheKey = ['leaderboard_cache_platform', platform, timePeriod];
      const cachedLeaderboard = await this.kvStore.get<{
        entries: AccountActivityEntry[];
        timestamp: number;
      }>(cacheKey);

      // If cache is valid, use it
      if (
        cachedLeaderboard &&
        Date.now() - cachedLeaderboard.timestamp < this.LEADERBOARD_CACHE_TTL
      ) {
        return cachedLeaderboard.entries.slice(offset, offset + limit);
      }

      // Otherwise, generate the leaderboard
      const accounts = await this.kvStore.list<PlatformAccountActivity>(['near_account_platform']);
      const timePeriodStart = this.getTimePeriodStart(timePeriod);

      // Filter accounts by platform and time period
      const filteredAccounts = accounts
        .filter((account) =>
          account.value.platform === platform &&
          account.value.lastPostTimestamp >= timePeriodStart
        )
        .map((account) => account.value);

      // Sort by post count (descending)
      const sortedAccounts = filteredAccounts.sort((a, b) => b.postCount - a.postCount);

      // Cache the result
      await this.kvStore.set(cacheKey, {
        entries: sortedAccounts,
        timestamp: Date.now(),
      });

      // Transform and return paginated result
      return sortedAccounts.slice(offset, offset + limit).map((entry, index) => ({
        signerId: entry.signerId,
        totalPosts: entry.postCount,
        totalLikes: 0, // These metrics are not tracked yet
        totalReposts: 0,
        totalReplies: 0,
        totalQuotes: 0,
        totalScore: entry.postCount, // Currently score is just post count
        rank: offset + index + 1,
        lastActive: new Date(entry.lastPostTimestamp).toISOString(),
      }));
    } catch (error) {
      console.error('Error getting platform leaderboard:', error);
      throw createPlatformError(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to get platform leaderboard for ${platform}`,
        platform,
      );
    }
  }

  /**
   * Get total number of accounts with activity
   * @param timePeriod Time period for filtering
   * @returns Total number of accounts
   */
  async getTotalAccounts(timePeriod: TimePeriod = TimePeriod.ALL): Promise<number> {
    try {
      const accounts = await this.kvStore.list<AccountActivity>(['near_account']);
      const timePeriodStart = this.getTimePeriodStart(timePeriod);

      // Filter accounts by time period
      return accounts.filter((account) => account.value.lastPostTimestamp >= timePeriodStart)
        .length;
    } catch (error) {
      console.error('Error getting total accounts:', error);
      throw createApiError(ApiErrorCode.INTERNAL_ERROR, 'Failed to get total accounts');
    }
  }

  /**
   * Get total number of accounts with activity for a specific platform
   * @param platform Platform name
   * @param timePeriod Time period for filtering
   * @returns Total number of accounts
   */
  async getTotalPlatformAccounts(
    platform: PlatformName,
    timePeriod: TimePeriod = TimePeriod.ALL,
  ): Promise<number> {
    try {
      const accounts = await this.kvStore.list<PlatformAccountActivity>(['near_account_platform']);
      const timePeriodStart = this.getTimePeriodStart(timePeriod);

      // Filter accounts by platform and time period
      return accounts.filter((account) =>
        account.value.platform === platform &&
        account.value.lastPostTimestamp >= timePeriodStart
      ).length;
    } catch (error) {
      console.error('Error getting total platform accounts:', error);
      throw createPlatformError(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to get total accounts for platform ${platform}`,
        platform,
      );
    }
  }
}
