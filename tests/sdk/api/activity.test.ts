import { assertEquals, assertExists } from 'jsr:@std/assert';
import { afterEach, beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { ActivityApi } from '../../../packages/sdk/src/api/activity.ts';
import { Platform, TimePeriod } from '@crosspost/types';

describe('ActivityApi', () => {
  let activityApi: ActivityApi;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    // Save the original fetch function
    originalFetch = globalThis.fetch;

    // Create ActivityApi instance with mock options
    activityApi = new ActivityApi({
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      retries: 0,
      nearAuthData: {
        account_id: 'test.near',
        public_key: 'test-public-key',
        signature: 'test-signature',
        message: 'test-message',
        nonce: new Uint8Array(32),
        recipient: 'crosspost.near',
      },
    });
  });

  afterEach(() => {
    // Restore the original fetch function
    globalThis.fetch = originalFetch;
  });

  it('should get leaderboard successfully', async () => {
    // Mock fetch to return a successful response
    globalThis.fetch = async (url: string | URL | Request, _init?: RequestInit) => {
      assertEquals(url.toString().startsWith('https://api.example.com/api/activity'), true);

      return new Response(
        JSON.stringify({
          data: {
            entries: [
              { signerId: 'user1.near', postCount: 10, lastPostTimestamp: Date.now() },
              { signerId: 'user2.near', postCount: 5, lastPostTimestamp: Date.now() - 86400000 },
            ],
            timeframe: 'all',
            total: 2,
            limit: 10,
            offset: 0,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    };

    // Call the API
    const response = await activityApi.getLeaderboard({
      timeframe: TimePeriod.ALL,
      limit: 10,
      offset: 0,
    });

    // Verify the response
    assertExists(response);
    assertExists(response.data);
    assertEquals(response.data.entries.length, 2);
    assertEquals(response.data.entries[0].signerId, 'user1.near');
    assertEquals(response.data.entries[1].signerId, 'user2.near');
    assertEquals(response.data.timeframe, 'all');
  });

  it('should get account activity successfully', async () => {
    // Mock fetch to return a successful response
    globalThis.fetch = async (url: string | URL | Request, _init?: RequestInit) => {
      assertEquals(url.toString().includes('/api/activity/user1.near'), true);

      return new Response(
        JSON.stringify({
          data: {
            signerId: 'user1.near',
            timeframe: 'all',
            totalPosts: 10,
            totalLikes: 5,
            totalReposts: 3,
            totalReplies: 2,
            totalQuotes: 1,
            totalScore: 21,
            rank: 1,
            lastActive: new Date().toISOString(),
            platforms: [
              {
                platform: Platform.TWITTER,
                posts: 8,
                likes: 4,
                reposts: 2,
                replies: 1,
                quotes: 1,
                score: 16,
                lastActive: new Date().toISOString(),
              },
            ],
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    };

    // Call the API
    const response = await activityApi.getAccountActivity('user1.near', {
      timeframe: TimePeriod.ALL,
    });

    // Verify the response
    assertExists(response);
    assertExists(response.data);
    assertEquals(response.data.signerId, 'user1.near');
    assertEquals(response.data.totalPosts, 10);
    assertEquals(response.data.platforms.length, 1);
    assertEquals(response.data.platforms[0].platform, Platform.TWITTER);
  });

  it('should get account posts successfully', async () => {
    // Mock fetch to return a successful response
    globalThis.fetch = async (url: string | URL | Request, _init?: RequestInit) => {
      assertEquals(url.toString().includes('/api/activity/user1.near/posts'), true);

      return new Response(
        JSON.stringify({
          data: {
            signerId: 'user1.near',
            posts: [
              {
                id: 'post1',
                platform: Platform.TWITTER,
                type: 'post',
                content: 'Test post',
                url: 'https://twitter.com/user/status/123456',
                createdAt: new Date().toISOString(),
              },
              {
                id: 'post2',
                platform: Platform.TWITTER,
                type: 'repost',
                url: 'https://twitter.com/user/status/789012',
                createdAt: new Date(Date.now() - 86400000).toISOString(),
              },
            ],
            total: 2,
            limit: 10,
            offset: 0,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    };

    // Call the API
    const response = await activityApi.getAccountPosts('user1.near', { limit: 10, offset: 0 });

    // Verify the response
    assertExists(response);
    assertExists(response.data);
    assertEquals(response.data.signerId, 'user1.near');
    assertEquals(response.data.posts.length, 2);
    assertEquals(response.data.posts[0].id, 'post1');
    assertEquals(response.data.posts[0].platform, Platform.TWITTER);
    assertEquals(response.data.posts[0].type, 'post');
    assertEquals(response.data.posts[1].id, 'post2');
    assertEquals(response.data.posts[1].type, 'repost');
  });

  it('should handle errors gracefully', async () => {
    // Mock fetch to return an error response
    globalThis.fetch = async (_url: string | URL | Request, _init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          error: {
            type: 'not_found',
            message: 'Account not found',
            status: 404,
          },
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    };

    try {
      // Call the API with a non-existent account
      await activityApi.getAccountActivity('nonexistent.near');
      // If we get here, the test should fail
      assertEquals(true, false, 'Expected an error to be thrown');
    } catch (error) {
      // Verify the error
      assertExists(error);
      assertEquals((error as any).message.includes('Account not found'), true);
    }
  });
});
