import { describe, expect, it, vi } from 'vitest';
import { createLocalPluginRuntime } from 'every-plugin/testing';
import CrosspostPlugin from '../../index';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Activity Integration Tests', () => {
  const runtime = createLocalPluginRuntime({
    registry: {
      '@crosspost/plugin': {
        remoteUrl: 'http://localhost:3000/remoteEntry.js',
        version: '1.0.0',
      },
    },
  }, {
    '@crosspost/plugin': CrosspostPlugin,
  });

  const config = {
    variables: {
      baseUrl: 'https://api.opencrosspost.com',
      timeout: 5000,
    },
    secrets: {
      nearAuthData: JSON.stringify({
        account_id: 'test.near',
        public_key: 'ed25519:test',
        signature: 'test-signature',
        message: 'test-message',
        nonce: new Array(32).fill(0).map((_, i) => i),
        recipient: 'crosspost.near',
      }),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get leaderboard', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          timeframe: 'week',
          generatedAt: '2023-01-01T00:00:00Z',
          entries: [
            {
              rank: 1,
              signerId: 'test.near',
              totalScore: 120,
              totalPosts: 10,
              totalLikes: 100,
              totalReposts: 5,
              totalQuotes: 2,
              totalReplies: 3,
              firstPostTimestamp: '2023-01-01T00:00:00Z',
              lastActive: '2023-01-01T00:00:00Z',
            },
          ],
        }),
    });

    const { client } = await runtime.usePlugin('@crosspost/plugin', config);
    const result = await client.activity.getLeaderboard();

    expect(result.timeframe).toBe('week');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].signerId).toBe('test.near');
  });

  it('should get account activity', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          signerId: 'test.near',
          timeframe: 'week',
          rank: 1,
          totalScore: 120,
          totalPosts: 10,
          totalLikes: 100,
          totalReposts: 5,
          totalQuotes: 2,
          totalReplies: 3,
          lastActive: '2023-01-01T00:00:00Z',
          platforms: [],
        }),
    });

    const { client } = await runtime.usePlugin('@crosspost/plugin', config);
    const result = await client.activity.getAccountActivity({
      signerId: 'test.near',
    });

    expect(result.signerId).toBe('test.near');
    expect(result.totalPosts).toBe(10);
  });

  it('should get account posts', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          posts: [
            {
              id: 'post-123',
              platform: 'twitter',
              content: 'Hello world!',
              createdAt: '2023-01-01T00:00:00Z',
            },
          ],
          pagination: {
            offset: 0,
            limit: 10,
            total: 1,
          },
        }),
    });

    const { client } = await runtime.usePlugin('@crosspost/plugin', config);
    const result = await client.activity.getAccountPosts({
      signerId: 'test.near',
    });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].id).toBe('post-123');
  });
});
