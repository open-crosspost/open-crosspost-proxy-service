// Test actual functionality of the Crosspost plugin
import { describe, expect, it, vi } from 'vitest';
import { CrosspostService } from '../../service';
import type { NearAuthData } from '../../types/auth';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Crosspost Plugin Functionality Tests', () => {
  const mockNearAuthData: NearAuthData = {
    account_id: 'test.near',
    public_key: 'ed25519:test',
    signature: 'test-signature',
    message: 'test-message',
    nonce: new Array(32).fill(0).map((_, i) => i),
    recipient: 'crosspost.near',
  };

  const service = new CrosspostService(
    'https://api.opencrosspost.com',
    mockNearAuthData,
    5000,
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create service instance successfully', () => {
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(CrosspostService);
  });

  it('should handle health check', async () => {
    const mockResponse = {
      status: 'ok',
      timestamp: '2023-01-01T00:00:00Z',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await service.getHealthStatus();
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should handle NEAR authorization', async () => {
    const mockResponse = {
      signerId: 'test.near',
      isAuthorized: true,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await service.authorizeNearAccount();
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should handle getting connected accounts', async () => {
    const mockResponse = {
      accounts: [
        {
          platform: 'twitter',
          userId: '123456',
          connectedAt: '2023-01-01T00:00:00Z',
          profile: null,
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await service.getConnectedAccounts();
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should handle post creation', async () => {
    const mockResponse = {
      summary: { total: 1, succeeded: 1, failed: 0 },
      results: [
        {
          platform: 'twitter',
          userId: '123456',
          details: { id: 'post-123', success: true },
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await service.createPost({
      targets: [{ platform: 'twitter', userId: '123456' }],
      content: [{ text: 'Hello from Crosspost!' }],
    });
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should handle rate limits', async () => {
    const mockResponse = {
      limits: {
        post: {
          remaining: 100,
          reset: '2023-01-01T00:00:00Z',
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await service.getRateLimits();
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          errors: [{ message: 'Authentication failed', code: 'AUTH_ERROR' }],
        }),
    });

    await expect(service.authorizeNearAccount()).rejects.toThrow();
  });

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(service.getHealthStatus()).rejects.toThrow('Network error');
  });

  it('should make correct HTTP requests', async () => {
    const mockResponse = { success: true };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await service.getHealthStatus();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://api.opencrosspost.com/health'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }),
      }),
    );
  });
});
