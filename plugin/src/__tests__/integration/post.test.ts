import { describe, expect, it, vi } from 'vitest';
import { createLocalPluginRuntime } from 'every-plugin/testing';
import CrosspostPlugin from '../../index';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Post Integration Tests', () => {
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

  it('should create post', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          summary: { total: 1, succeeded: 1, failed: 0 },
          results: [
            {
              platform: 'twitter',
              userId: '123456',
              details: { id: 'post-123' },
            },
          ],
        }),
    });

    const { client } = await runtime.usePlugin('@crosspost/plugin', config);
    const result = await client.post.create({
      targets: [{ platform: 'twitter', userId: '123456' }],
      content: [{ text: 'Hello world!' }],
    });

    expect(result.data.summary.total).toBe(1);
    expect(result.data.summary.succeeded).toBe(1);
    expect(result.data.results).toHaveLength(1);
  });

  it('should delete post', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          summary: { total: 1, succeeded: 1, failed: 0 },
          results: [
            {
              platform: 'twitter',
              userId: '123456',
              details: { success: true, id: 'post-123' },
            },
          ],
        }),
    });

    const { client } = await runtime.usePlugin('@crosspost/plugin', config);
    const result = await client.post.delete({
      platform: 'twitter',
      userId: '123456',
      postId: 'post-123',
    });

    expect(result.data.summary.succeeded).toBe(1);
  });

  it('should like post', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          summary: { total: 1, succeeded: 1, failed: 0 },
          results: [
            {
              platform: 'twitter',
              userId: '123456',
              details: { success: true, id: 'post-123' },
            },
          ],
        }),
    });

    const { client } = await runtime.usePlugin('@crosspost/plugin', config);
    const result = await client.post.like({
      platform: 'twitter',
      userId: '123456',
      postId: 'post-123',
    });

    expect(result.data.summary.succeeded).toBe(1);
  });
});
