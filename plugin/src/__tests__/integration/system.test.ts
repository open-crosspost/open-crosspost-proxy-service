import { describe, expect, it, vi } from 'vitest';
import { createLocalPluginRuntime } from 'every-plugin/testing';
import CrosspostPlugin from '../../index';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('System Integration Tests', () => {
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

  it('should get health status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 'ok',
          timestamp: '2023-01-01T00:00:00Z',
        }),
    });

    const { client } = await runtime.usePlugin('@crosspost/plugin', config);
    const result = await client.system.getHealthStatus();

    expect(result.status).toBe('ok');
  });

  it('should get rate limits', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          limits: {
            post: {
              remaining: 100,
              reset: '2023-01-01T00:00:00Z',
            },
          },
        }),
    });

    const { client } = await runtime.usePlugin('@crosspost/plugin', config);
    const result = await client.system.getRateLimits();

    expect(result.limits.post.remaining).toBe(100);
  });

  it('should get endpoint rate limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          endpoint: '/api/post',
          remaining: 50,
          reset: '2023-01-01T00:00:00Z',
        }),
    });

    const { client } = await runtime.usePlugin('@crosspost/plugin', config);
    const result = await client.system.getEndpointRateLimit({
      endpoint: '/api/post',
    });

    expect(result.endpoint).toBe('/api/post');
    expect(result.remaining).toBe(50);
  });
});
