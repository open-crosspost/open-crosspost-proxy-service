import type { Filter } from '@crosspost/types';
import {
  AccountActivity,
  AccountActivityEntry,
  AccountActivityResponse,
  AccountPost,
  ActivityType,
  ApiErrorCode,
  Platform,
  PlatformAccountActivity,
  PlatformActivity,
  PlatformName,
  PostRecord,
  TimePeriod,
} from '@crosspost/types';
import { createApiError } from '../../errors/api-error.ts';
import { PrefixedKvStore } from '../../utils/kv-store.utils.ts';
import { getPostUrl } from '../../utils/platform.utils.ts';

/**
 * Activity Tracking Service
 * Tracks NEAR account activity and provides leaderboard functionality
 */
export class ActivityTrackingService {
  private readonly MAX_POSTS_PER_ACCOUNT = 100; // Maximum number of posts to store per account
  private readonly LEADERBOARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Creates an instance of ActivityTrackingService with dependency injection
   * @param kvStore KV store for activity data
   */
  constructor(private kvStore: PrefixedKvStore) {}

  /**
   * Track a post for a NEAR account
   * @param signerId NEAR account ID
   * @param platform Platform name
   * @param userId User ID on the platform
   * @param postId Post ID
   * @param type Type of activity
   */
  async trackPost(
    signerId: string,
    platform: PlatformName,
    userId: string,
    postId: string,
    type: ActivityType = ActivityType.POST,
  ): Promise<void> {
    try {
      const now = Date.now();

      // Update account activity record
      await this.updateAccountActivity(signerId, now);

      // Update platform-specific account activity record
      await this.updatePlatformAccountActivity(signerId, platform, now);

      // Update post list
      await this.updateAccountPosts(signerId, platform, userId, postId, now, type);

      // Invalidate leaderboard cache
      await this.invalidateLeaderboardCache();
      await this.invalidatePlatformLeaderboardCache(platform);
    } catch (error) {
      console.error('Error tracking post:', error);
      throw createApiError(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to track post activity for platform ${platform}`,
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
   * @param type Type of activity
   */
  private async updateAccountPosts(
    signerId: string,
    platform: PlatformName,
    userId: string,
    postId: string,
    timestamp: number,
    type: ActivityType,
  ): Promise<void> {
    const key = ['near_account_posts', signerId];
    const posts = await this.kvStore.get<PostRecord[]>(key) || [];

    // Add new post at the beginning of the array
    posts.unshift({
      id: postId,
      p: platform,
      t: timestamp,
      u: userId,
      ty: type,
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
   * Get account activity, optionally filtered by platforms.
   * If platforms are specified, aggregates activity across those platforms.
   * Otherwise, returns the global account activity.
   * @param signerId NEAR account ID
   * @param filter Optional filter containing platforms array
   * @returns Account activity data or null if not found/no activity for filter
   */
  async getAccountActivity(
    signerId: string,
    filter?: Filter,
  ): Promise<AccountActivityResponse | null> {
    try {
      const timeframe = filter?.timeframe || TimePeriod.ALL;

      // Get all posts for the account and filter them
      const postsKey = ['near_account_posts', signerId];
      const allPosts = await this.kvStore.get<PostRecord[]>(postsKey) || [];
      const filteredPosts = this.filterPosts(allPosts, filter);

      // If no posts match the filter, return null
      if (filteredPosts.length === 0) {
        return null;
      }

      // Calculate metrics from filtered posts
      const {
        totalPosts,
        totalLikes,
        totalReposts,
        totalReplies,
        totalQuotes,
        totalScore,
      } = this.calculateActivityMetrics(filteredPosts);
      const lastPostTimestamp = Math.max(...filteredPosts.map((p) => p.t));

      // Get platform activities for breakdown
      let platformActivities: PlatformAccountActivity[] = [];

      if (!filter?.platforms || filter.platforms.length === 0) {
        const platformEntries = await this.kvStore.list<PlatformAccountActivity>([
          'near_account_platform',
          signerId,
        ]);
        platformActivities = platformEntries.map((entry) => entry.value);
      } else {
        // Get only the specified platforms
        for (const platform of filter.platforms) {
          const key = ['near_account_platform', signerId, platform];
          const activity = await this.kvStore.get<PlatformAccountActivity>(key);
          if (activity) {
            platformActivities.push(activity);
          }
        }
      }

      // Calculate platform breakdown based on filtered posts
      const platformBreakdown: PlatformActivity[] = platformActivities.map((pa) => {
        const platformPosts = filteredPosts.filter((post) => post.p === pa.platform);
        const platformPostCount = platformPosts.filter((p) =>
          p.ty === ActivityType.POST || p.ty === undefined
        ).length;
        const platformLikes = platformPosts.filter((p) => p.ty === ActivityType.LIKE).length;
        const platformReposts = platformPosts.filter((p) => p.ty === ActivityType.REPOST).length;
        const platformReplies = platformPosts.filter((p) => p.ty === ActivityType.REPLY).length;
        const platformQuotes = platformPosts.filter((p) => p.ty === ActivityType.QUOTE).length;
        const platformScore = platformPostCount + platformLikes + platformReposts +
          platformReplies + platformQuotes;
        const platformLastActive = platformPosts.length > 0
          ? Math.max(...platformPosts.map((p) => p.t))
          : pa.lastPostTimestamp;

        return {
          platform: pa.platform as Platform,
          posts: platformPostCount,
          likes: platformLikes,
          reposts: platformReposts,
          replies: platformReplies,
          quotes: platformQuotes,
          score: platformScore,
          lastActive: new Date(platformLastActive).toISOString(),
        };
      });

      const allAccountMetrics = await this.calculateAccountMetrics(filter);
      const accountRank = allAccountMetrics.findIndex((account) => account.signerId === signerId) +
        1;

      return {
        signerId,
        timeframe: timeframe,
        totalPosts: totalPosts,
        totalLikes: totalLikes,
        totalReposts: totalReposts,
        totalReplies: totalReplies,
        totalQuotes: totalQuotes,
        totalScore: totalScore,
        rank: accountRank,
        lastActive: new Date(lastPostTimestamp).toISOString(),
        platforms: platformBreakdown,
      };
    } catch (error) {
      console.error('Error getting account activity:', error);
      throw createApiError(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to get account activity for ${signerId}`,
      );
    }
  }

  /**
   * Get account posts with optional filtering
   * @param signerId NEAR account ID
   * @param limit Maximum number of posts to return
   * @param offset Number of posts to skip
   * @param filter Optional filter for platforms, types, and timeframe
   * @returns Array of post records
   */
  async getAccountPosts(
    signerId: string,
    limit = 10,
    offset = 0,
    filter?: Filter,
  ): Promise<AccountPost[]> {
    try {
      const key = ['near_account_posts', signerId];
      const posts = await this.kvStore.get<PostRecord[]>(key) || [];

      // Apply filter
      let filteredPosts = posts;

      // Filter by timeframe if specified
      if (filter?.timeframe && filter.timeframe !== TimePeriod.ALL) {
        const timePeriodStart = this.getTimePeriodStart(filter.timeframe, filter?.startDate);
        const timePeriodEnd = this.getTimePeriodEnd(filter.timeframe, filter?.endDate);
        filteredPosts = filteredPosts.filter((post) =>
          post.t >= timePeriodStart && post.t <= timePeriodEnd
        );
      }

      // Filter by platforms if specified
      if (filter?.platforms && filter.platforms.length > 0) {
        filteredPosts = filteredPosts.filter((post) =>
          filter.platforms!.includes(post.p as PlatformName)
        );
      }

      // Filter by types if specified
      if (filter?.types && filter.types.length > 0) {
        filteredPosts = filteredPosts.filter((post) =>
          filter.types!.includes(post.ty as ActivityType)
        );
      }

      // Apply pagination
      const paginatedPosts = filteredPosts.slice(offset, offset + limit);

      // Convert to AccountPost format
      return paginatedPosts.map((post) => ({
        id: post.id,
        platform: post.p as Platform,
        userId: post.u,
        type: post.ty as ActivityType,
        createdAt: new Date(post.t).toISOString(),
        url: getPostUrl(post.p as PlatformName, post.id),
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
   * Get the start timestamp for a time period
   * @param timePeriod Time period
   * @param startDate Custom range start (for CUSTOM timeframe)
   * @returns Start timestamp
   */
  private getTimePeriodStart(timePeriod: TimePeriod, startDate?: string): number {
    if (timePeriod === TimePeriod.CUSTOM) {
      return startDate ? new Date(startDate).getTime() : 0;
    }

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
   * Get the end timestamp for a time period
   * @param timePeriod Time period
   * @param endDate Custom range end (for CUSTOM timeframe, optional - defaults to now)
   * @returns End timestamp
   */
  private getTimePeriodEnd(timePeriod: TimePeriod, endDate?: string): number {
    if (timePeriod === TimePeriod.CUSTOM) {
      // If endDate is provided, use it; otherwise default to now
      return endDate ? new Date(endDate).getTime() : Date.now();
    }

    // For predefined periods, end time is "now"
    return Date.now();
  }

  /**
   * Calculate activity metrics from filtered posts
   * @param posts Array of post records
   * @returns Activity metrics object
   */
  private calculateActivityMetrics(posts: PostRecord[]): {
    totalPosts: number;
    totalLikes: number;
    totalReposts: number;
    totalReplies: number;
    totalQuotes: number;
    totalScore: number;
  } {
    const totalPosts = posts.filter((p) => p.ty === ActivityType.POST || p.ty === undefined).length;
    const totalLikes = posts.filter((p) => p.ty === ActivityType.LIKE).length;
    const totalReposts = posts.filter((p) => p.ty === ActivityType.REPOST).length;
    const totalReplies = posts.filter((p) => p.ty === ActivityType.REPLY).length;
    const totalQuotes = posts.filter((p) => p.ty === ActivityType.QUOTE).length;
    const totalScore = totalPosts + totalLikes + totalReposts + totalReplies + totalQuotes;

    return {
      totalPosts,
      totalLikes,
      totalReposts,
      totalReplies,
      totalQuotes,
      totalScore,
    };
  }

  /**
   * Filter posts by timeframe and platforms
   * @param posts Array of post records
   * @param filter Filter criteria
   * @returns Filtered posts
   */
  private filterPosts(posts: PostRecord[], filter?: Filter): PostRecord[] {
    const timeframe = filter?.timeframe || TimePeriod.ALL;
    const platforms = filter?.platforms;
    const timePeriodStart = this.getTimePeriodStart(timeframe, filter?.startDate);
    const timePeriodEnd = this.getTimePeriodEnd(timeframe, filter?.endDate);

    let filteredPosts = posts.filter((post) =>
      post.t >= timePeriodStart && post.t <= timePeriodEnd
    );

    if (platforms && platforms.length > 0) {
      filteredPosts = filteredPosts.filter((post) => platforms.includes(post.p as PlatformName));
    }

    return filteredPosts;
  }

  /**
   * Calculate account metrics for a given timeframe and filter
   * @param filter Optional filter for platforms, timeframe, etc.
   * @returns Sorted array of account metrics (by totalScore descending)
   */
  private async calculateAccountMetrics(
    filter?: Filter,
  ): Promise<
    Array<{
      signerId: string;
      totalPosts: number;
      totalLikes: number;
      totalReposts: number;
      totalReplies: number;
      totalQuotes: number;
      totalScore: number;
      firstPostTimestamp: number;
      lastPostTimestamp: number;
    }>
  > {
    const platforms = filter?.platforms;

    // Get all accounts that have activity
    let accountIds: string[];

    if (platforms && platforms.length > 0) {
      // Get platform-specific accounts if platforms are specified
      const accounts = await this.kvStore.list<PlatformAccountActivity>([
        'near_account_platform',
      ]);

      // Get unique account IDs for the specified platforms
      const platformAccountIds = new Set<string>();
      accounts.forEach(({ value }) => {
        if (platforms.includes(value.platform as PlatformName)) {
          platformAccountIds.add(value.signerId);
        }
      });
      accountIds = Array.from(platformAccountIds);
    } else {
      // Get all global accounts if no platforms are specified
      const accounts = await this.kvStore.list<AccountActivity>(['near_account']);
      accountIds = accounts.map(({ value }) => value.signerId);
    }

    // Calculate metrics for each account based on filtered posts
    const accountMetrics: Array<{
      signerId: string;
      totalPosts: number;
      totalLikes: number;
      totalReposts: number;
      totalReplies: number;
      totalQuotes: number;
      totalScore: number;
      firstPostTimestamp: number;
      lastPostTimestamp: number;
    }> = [];

    for (const signerId of accountIds) {
      const postsKey = ['near_account_posts', signerId];
      const allPosts = await this.kvStore.get<PostRecord[]>(postsKey) || [];

      // Filter posts
      const filteredPosts = this.filterPosts(allPosts, filter);

      // Only include accounts that have posts in the timeframe
      if (filteredPosts.length > 0) {
        const {
          totalPosts,
          totalLikes,
          totalReposts,
          totalReplies,
          totalQuotes,
          totalScore,
        } = this.calculateActivityMetrics(filteredPosts);

        accountMetrics.push({
          signerId,
          totalPosts,
          totalLikes,
          totalReposts,
          totalReplies,
          totalQuotes,
          totalScore,
          firstPostTimestamp: Math.min(...filteredPosts.map((p) => p.t)),
          lastPostTimestamp: Math.max(...filteredPosts.map((p) => p.t)),
        });
      }
    }

    // Sort by total score (descending)
    return accountMetrics.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Get leaderboard with optional filtering
   * @param limit Maximum number of entries to return
   * @param offset Number of entries to skip
   * @param timePeriod Time period for filtering
   * @param filter Optional filter for platforms
   * @returns Array of leaderboard entries
   */
  async getLeaderboard(
    limit = 10,
    offset = 0,
    filter?: Filter,
  ): Promise<AccountActivityEntry[]> {
    try {
      // Default timeframe if not provided
      const timeframe = filter?.timeframe || TimePeriod.ALL;
      const platforms = filter?.platforms;

      let cacheKey: (string | number | TimePeriod)[] | null = null;
      let shouldCache = false;

      if (timeframe !== TimePeriod.CUSTOM) {
        if (!platforms || platforms.length === 0) {
          // Global leaderboard
          cacheKey = ['leaderboard_cache', timeframe];
          shouldCache = true;
        } else if (platforms.length === 1) {
          // Single platform leaderboard
          cacheKey = ['leaderboard_cache_platform', platforms[0], timeframe];
          shouldCache = true;
        }
      }
      // For custom timeframes or multi-platform requests, don't cache

      // Try to get from cache first if applicable
      if (cacheKey) {
        const cachedLeaderboard = await this.kvStore.get<{
          entries: AccountActivityEntry[];
          timestamp: number;
        }>(cacheKey);

        // If cache is valid, use it
        if (
          cachedLeaderboard &&
          Date.now() - cachedLeaderboard.timestamp < this.LEADERBOARD_CACHE_TTL
        ) {
          // Return paginated result from cache
          return cachedLeaderboard.entries.slice(offset, offset + limit).map((entry, index) => ({
            ...entry,
            rank: offset + index + 1, // Recalculate rank based on pagination
          }));
        }
      }

      // Otherwise, generate the leaderboard
      const sortedAccounts = await this.calculateAccountMetrics(filter);

      // Prepare the full leaderboard entries (without rank initially)
      const fullLeaderboardEntries: Omit<AccountActivityEntry, 'rank'>[] = sortedAccounts.map((
        entry,
      ) => ({
        signerId: entry.signerId,
        totalPosts: entry.totalPosts,
        totalLikes: entry.totalLikes,
        totalReposts: entry.totalReposts,
        totalReplies: entry.totalReplies,
        totalQuotes: entry.totalQuotes,
        totalScore: entry.totalScore,
        lastActive: new Date(entry.lastPostTimestamp).toISOString(),
        firstPostTimestamp: new Date(entry.firstPostTimestamp).toISOString(),
      }));

      // Cache the full result if applicable (global or single platform)
      if (cacheKey && shouldCache) {
        await this.kvStore.set(cacheKey, {
          entries: fullLeaderboardEntries, // Cache the unranked, full list
          timestamp: Date.now(),
        });
      }

      // Apply pagination and add rank to the paginated result
      return fullLeaderboardEntries.slice(offset, offset + limit).map((entry, index) => ({
        ...entry,
        rank: offset + index + 1, // Calculate rank based on paginated position
      }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);

      throw createApiError(ApiErrorCode.INTERNAL_ERROR, 'Failed to get leaderboard');
    }
  }

  /**
   * Get total count of posts for an account with optional filtering
   * @param signerId NEAR account ID
   * @param filter Optional filter for platforms, types, and timeframe
   * @returns Total number of posts matching the filter
   */
  async getTotalPostCount(
    signerId: string,
    filter?: {
      platforms?: PlatformName[];
      types?: ActivityType[];
      timeframe?: TimePeriod;
    },
  ): Promise<number> {
    try {
      const key = ['near_account_posts', signerId];
      const posts = await this.kvStore.get<PostRecord[]>(key) || [];

      // Apply filter
      let filteredPosts = posts;

      // Filter by timeframe if specified
      if (filter?.timeframe && filter.timeframe !== TimePeriod.ALL) {
        const timePeriodStart = this.getTimePeriodStart(filter.timeframe);
        filteredPosts = filteredPosts.filter((post) => post.t >= timePeriodStart);
      }

      // Filter by platforms if specified
      if (filter?.platforms && filter.platforms.length > 0) {
        filteredPosts = filteredPosts.filter((post) =>
          filter.platforms!.includes(post.p as PlatformName)
        );
      }

      // Filter by types if specified
      if (filter?.types && filter.types.length > 0) {
        filteredPosts = filteredPosts.filter((post) =>
          filter.types!.includes(post.ty as ActivityType)
        );
      }

      return filteredPosts.length;
    } catch (error) {
      console.error('Error getting total post count:', error);

      throw createApiError(
        ApiErrorCode.INTERNAL_ERROR,
        `Failed to get total post count for ${signerId}`,
      );
    }
  }

  /**
   * Get total number of accounts with activity, optionally filtered
   * @param filter Optional filter for platforms and timeframe
   * @returns Total number of accounts
   */
  async getTotalAccounts(
    filter?: Filter,
  ): Promise<number> {
    try {
      const timeframe = filter?.timeframe || TimePeriod.ALL;
      const platforms = filter?.platforms;
      const timePeriodStart = this.getTimePeriodStart(timeframe, filter?.startDate);
      const timePeriodEnd = this.getTimePeriodEnd(timeframe, filter?.endDate);

      // For custom timeframes, use post-based filtering for accuracy
      if (timeframe === TimePeriod.CUSTOM) {
        // Get all accounts that have activity
        let accountIds: string[];

        if (platforms && platforms.length > 0) {
          // Get platform-specific accounts if platforms are specified
          const accounts = await this.kvStore.list<PlatformAccountActivity>([
            'near_account_platform',
          ]);

          // Get unique account IDs for the specified platforms
          const platformAccountIds = new Set<string>();
          accounts.forEach(({ value }) => {
            if (platforms.includes(value.platform as PlatformName)) {
              platformAccountIds.add(value.signerId);
            }
          });
          accountIds = Array.from(platformAccountIds);
        } else {
          // Get all global accounts if no platforms are specified
          const accounts = await this.kvStore.list<AccountActivity>(['near_account']);
          accountIds = accounts.map(({ value }) => value.signerId);
        }

        // Count accounts that have posts within the custom date range
        let accountsWithActivity = 0;

        for (const signerId of accountIds) {
          const postsKey = ['near_account_posts', signerId];
          const allPosts = await this.kvStore.get<PostRecord[]>(postsKey) || [];

          // Filter posts by timeframe and platforms
          let filteredPosts = allPosts.filter((post) =>
            post.t >= timePeriodStart && post.t <= timePeriodEnd
          );

          if (platforms && platforms.length > 0) {
            filteredPosts = filteredPosts.filter((post) =>
              platforms.includes(post.p as PlatformName)
            );
          }

          // Count this account if it has posts in the timeframe
          if (filteredPosts.length > 0) {
            accountsWithActivity++;
          }
        }

        return accountsWithActivity;
      }

      if (platforms && platforms.length > 0) {
        // Get platform-specific accounts
        const accounts = await this.kvStore.list<PlatformAccountActivity>([
          'near_account_platform',
        ]);

        // Filter accounts by platforms and time period
        return accounts.filter(({ value }) =>
          platforms.includes(value.platform as PlatformName) &&
          value.lastPostTimestamp >= timePeriodStart &&
          value.lastPostTimestamp <= timePeriodEnd
        ).length;
      } else {
        // Get all accounts
        const accounts = await this.kvStore.list<AccountActivity>(['near_account']);

        // Filter accounts by time period
        return accounts.filter(({ value }) => value.lastPostTimestamp >= timePeriodStart).length;
      }
    } catch (error) {
      console.error('Error getting total accounts:', error);

      throw createApiError(ApiErrorCode.INTERNAL_ERROR, 'Failed to get total accounts');
    }
  }
}
