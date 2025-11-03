import {
  AccountActivityEntry,
  AccountActivityResponse,
  AccountPost,
  ActivityType,
  Platform,
  PlatformName,
  TimePeriod,
} from '@crosspost/types';

import { ActivityTrackingService } from '../../src/domain/services/activity-tracking.service.ts';
import { PrefixedKvStore } from '../../src/utils/kv-store.utils.ts';

/**
 * Mock implementation of ActivityTrackingService for testing
 */
export class MockActivityTrackingService extends ActivityTrackingService {
  constructor() {
    // Create a mock KV store
    const mockKvStore = new PrefixedKvStore(['test']);
    super(mockKvStore);
  }

  // Override methods with mock implementations
  override async trackPost(): Promise<void> {
    return Promise.resolve();
  }

  override async getLeaderboard(): Promise<AccountActivityEntry[]> {
    return [
      {
        signerId: 'user1.near',
        totalPosts: 10,
        totalLikes: 0,
        totalReposts: 0,
        totalReplies: 0,
        totalQuotes: 0,
        totalScore: 10,
        rank: 1,
        lastActive: new Date(Date.now()).toISOString(),
        firstPostTimestamp: new Date(Date.now()).toISOString(),
      },
      {
        signerId: 'user2.near',
        totalPosts: 5,
        totalLikes: 0,
        totalReposts: 0,
        totalReplies: 0,
        totalQuotes: 0,
        totalScore: 5,
        rank: 2,
        lastActive: new Date(Date.now() - 86400000).toISOString(),
        firstPostTimestamp: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  }

  override async getTotalAccounts(): Promise<number> {
    return 2;
  }

  override async getAccountActivity(
    signerId: string,
    filter?: { platforms?: PlatformName[]; timeframe?: TimePeriod },
  ): Promise<AccountActivityResponse | null> {
    if (signerId === 'user1.near') {
      // If specific platforms are requested
      if (filter?.platforms?.length === 1 && filter.platforms[0] === Platform.TWITTER) {
        return {
          signerId: 'user1.near',
          timeframe: filter?.timeframe || TimePeriod.ALL,
          totalPosts: 8,
          totalLikes: 0,
          totalReposts: 0,
          totalReplies: 0,
          totalQuotes: 0,
          totalScore: 8,
          rank: 0,
          lastActive: new Date(Date.now()).toISOString(),
          platforms: [
            {
              platform: Platform.TWITTER,
              posts: 8,
              likes: 0,
              reposts: 0,
              replies: 0,
              quotes: 0,
              score: 8,
              lastActive: new Date(Date.now()).toISOString(),
            },
          ],
        };
      }

      // Default global activity
      return {
        signerId: 'user1.near',
        timeframe: filter?.timeframe || TimePeriod.ALL,
        totalPosts: 10,
        totalLikes: 0,
        totalReposts: 0,
        totalReplies: 0,
        totalQuotes: 0,
        totalScore: 10,
        rank: 0,
        lastActive: new Date(Date.now()).toISOString(),
        platforms: [
          {
            platform: Platform.TWITTER,
            posts: 8,
            likes: 0,
            reposts: 0,
            replies: 0,
            quotes: 0,
            score: 8,
            lastActive: new Date(Date.now()).toISOString(),
          },
          {
            platform: Platform.TWITTER, // Using TWITTER as a second platform for testing
            posts: 2,
            likes: 0,
            reposts: 0,
            replies: 0,
            quotes: 0,
            score: 2,
            lastActive: new Date(Date.now() - 86400000).toISOString(),
          },
        ],
      };
    }
    return null;
  }

  override async getAccountPosts(
    signerId: string,
    limit = 10,
    offset = 0,
    filter?: {
      platforms?: PlatformName[];
      types?: ActivityType[];
    },
  ): Promise<AccountPost[]> {
    // If filtering by Twitter platform
    if (filter?.platforms?.length === 1 && filter.platforms[0] === Platform.TWITTER) {
      return [
        {
          id: 'post1',
          platform: Platform.TWITTER,
          userId: 'twitterUser1',
          type: ActivityType.POST,
          createdAt: new Date().toISOString(),
          url: 'https://twitter.com/user/status/post1',
        },
      ];
    }

    // Default posts (all platforms)
    return [
      {
        id: 'post1',
        platform: Platform.TWITTER,
        userId: 'twitterUser1',
        type: ActivityType.POST,
        createdAt: new Date().toISOString(),
        url: 'https://twitter.com/user/status/post1',
      },
      {
        id: 'post2',
        platform: Platform.TWITTER,
        userId: 'twitterUser1',
        type: ActivityType.POST,
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        url: 'https://twitter.com/user/status/post2',
      },
    ];
  }

  override async getTotalPostCount(
    signerId: string,
    filter?: {
      platforms?: PlatformName[];
      types?: ActivityType[];
    },
  ): Promise<number> {
    // If filtering by Twitter platform
    if (filter?.platforms?.length === 1 && filter.platforms[0] === Platform.TWITTER) {
      return 1;
    }

    // Default count (all platforms)
    return 2;
  }
}
