import {
  AccountActivity,
  AccountActivityEntry,
  AccountPost,
  Platform,
  PlatformAccountActivity,
  PlatformName,
} from '@crosspost/types';
import { Env } from '../../src/config/env.ts';

import { PrefixedKvStore } from '../../src/utils/kv-store.utils.ts';
import { ActivityTrackingService } from '../../src/domain/services/activity-tracking.service.ts';

/**
 * Mock implementation of ActivityTrackingService for testing
 */
export class MockActivityTrackingService extends ActivityTrackingService {
  constructor() {
    // Create a mock KV store
    const mockKvStore = new PrefixedKvStore(['test']);
    super({} as Env, mockKvStore);
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
      },
    ];
  }

  override async getPlatformLeaderboard(): Promise<AccountActivityEntry[]> {
    return [
      {
        signerId: 'user1.near',
        totalPosts: 8,
        totalLikes: 0,
        totalReposts: 0,
        totalReplies: 0,
        totalQuotes: 0,
        totalScore: 8,
        rank: 1,
        lastActive: new Date(Date.now()).toISOString(),
      },
      {
        signerId: 'user3.near',
        totalPosts: 3,
        totalLikes: 0,
        totalReposts: 0,
        totalReplies: 0,
        totalQuotes: 0,
        totalScore: 3,
        rank: 2,
        lastActive: new Date(Date.now() - 43200000).toISOString(),
      },
    ];
  }

  override async getTotalAccounts(): Promise<number> {
    return 2;
  }

  override async getTotalPlatformAccounts(): Promise<number> {
    return 2;
  }

  override async getAccountActivity(signerId: string): Promise<AccountActivity | null> {
    if (signerId === 'user1.near') {
      return {
        signerId: 'user1.near',
        postCount: 10,
        firstPostTimestamp: Date.now() - 604800000, // 1 week ago
        lastPostTimestamp: Date.now(),
      };
    }
    return null;
  }

  override async getPlatformAccountActivity(
    signerId: string,
    platform: PlatformName,
  ): Promise<PlatformAccountActivity | null> {
    if (signerId === 'user1.near' && platform === Platform.TWITTER) {
      return {
        signerId: 'user1.near',
        platform: Platform.TWITTER,
        postCount: 8,
        firstPostTimestamp: Date.now() - 604800000, // 1 week ago
        lastPostTimestamp: Date.now(),
      };
    }
    return null;
  }

  override async getAccountPosts(): Promise<AccountPost[]> {
    return [
      {
        id: 'post1',
        platform: Platform.TWITTER,
        type: 'post',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'post2',
        platform: Platform.TWITTER,
        type: 'post',
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      },
    ];
  }

  override async getAccountPlatformPosts(): Promise<AccountPost[]> {
    return [
      {
        id: 'post1',
        platform: Platform.TWITTER,
        type: 'post',
        createdAt: new Date().toISOString(),
      },
    ];
  }
}
