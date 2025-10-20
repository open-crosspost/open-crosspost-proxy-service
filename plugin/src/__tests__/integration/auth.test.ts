import { describe, expect, it, vi } from 'vitest';
import { createLocalPluginRuntime } from 'every-plugin/testing';
import CrosspostPlugin from '../../index';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Auth Integration Tests', () => {
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

  it('should authorize NEAR account', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          signerId: 'test.near',
          isAuthorized: true,
        }),
    });

    const { client } = await runtime.usePlugin('@crosspost/plugin', config);
    const result = await client.auth.authorizeNearAccount();

    expect(result.signerId).toBe('test.near');
    expect(result.isAuthorized).toBe(true);
  });

  it('should get NEAR authorization status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          signerId: 'test.near',
          isAuthorized: true,
          authorizedAt: '2023-01-01T00:00:00Z',
        }),
    });

    const { client } = await runtime.usePlugin('@crosspost/plugin', config);
    const result = await client.auth.getNearAuthorizationStatus();

    expect(result.signerId).toBe('test.near');
    expect(result.isAuthorized).toBe(true);
  });

  it('should login to platform', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          url: 'https://twitter.com/oauth/authorize?client_id=test',
        }),
    });

    const { client } = await runtime.usePlugin('@crosspost/plugin', config);
    const result = await client.auth.loginToPlatform({
      platform: 'twitter',
    });

    expect(result.url).toContain('twitter.com/oauth/authorize');
  });

  it('should get connected accounts', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          accounts: [
            {
              platform: 'twitter',
              userId: '123456',
              connectedAt: '2023-01-01T00:00:00Z',
              profile: null,
            },
          ],
        }),
    });

    const { client } = await runtime.usePlugin('@crosspost/plugin', config);
    const result = await client.auth.getConnectedAccounts();

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0].platform).toBe('twitter');
  });
});
