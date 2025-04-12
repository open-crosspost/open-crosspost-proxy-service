import { Env } from '../../src/config/env.ts';
import { ApiError, ApiErrorCode, Platform, PlatformError, PlatformName } from '@crosspost/types';
import {
  AccountActivity,
  ActivityTrackingService,
  LeaderboardEntry,
  PlatformAccountActivity,
  PlatformLeaderboardEntry,
  PostRecordResponse,
} from '../../src/domain/services/activity-tracking.service.ts';
import { PrefixedKvStore } from '../../src/utils/kv-store.utils.ts';

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

  override async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return [
      { signerId: 'user1.near', postCount: 10, lastPostTimestamp: Date.now() },
      { signerId: 'user2.near', postCount: 5, lastPostTimestamp: Date.now() - 86400000 },
    ];
  }

  override async getPlatformLeaderboard(): Promise<PlatformLeaderboardEntry[]> {
    return [
      {
        signerId: 'user1.near',
        postCount: 8,
        lastPostTimestamp: Date.now(),
        platform: Platform.TWITTER,
      },
      {
        signerId: 'user3.near',
        postCount: 3,
        lastPostTimestamp: Date.now() - 43200000,
        platform: Platform.TWITTER,
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

  override async getAccountPosts(): Promise<PostRecordResponse[]> {
    return [
      {
        postId: 'post1',
        platform: Platform.TWITTER,
        timestamp: new Date().toISOString(),
        userId: 'twitter-user-1',
      },
      {
        postId: 'post2',
        platform: Platform.TWITTER,
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        userId: 'twitter-user-1',
      },
    ];
  }

  override async getAccountPlatformPosts(): Promise<PostRecordResponse[]> {
    return [
      {
        postId: 'post1',
        platform: Platform.TWITTER,
        timestamp: new Date().toISOString(),
        userId: 'twitter-user-1',
      },
    ];
  }
}
