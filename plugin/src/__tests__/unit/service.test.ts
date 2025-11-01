import { Effect } from 'every-plugin/effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CrosspostService } from '../../service';
import type { NearAuthData } from '../../types/auth';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('CrosspostService', () => {
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

  describe('Auth Methods', () => {
    it('should authorize NEAR account', async () => {
      const mockResponse = {
        signerId: 'test.near',
        isAuthorized: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.authorizeNearAccount());

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/authorize/near'),
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should get NEAR authorization status', async () => {
      const mockResponse = {
        signerId: 'test.near',
        isAuthorized: true,
        authorizedAt: '2023-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.getNearAuthorizationStatus());

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/authorize/near/status'),
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('should login to platform', async () => {
      const mockResponse = {
        url: 'https://twitter.com/oauth/authorize?client_id=test',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.loginToPlatform('twitter'));

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/twitter/login'),
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should refresh token', async () => {
      const mockResponse = {
        platform: 'twitter',
        userId: '123456',
        status: {
          code: 'success',
          message: 'Token refreshed',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.refreshToken('twitter', '123456'));

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/twitter/refresh'),
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should get connected accounts', async () => {
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

      const result = await Effect.runPromise(service.getConnectedAccounts());

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/accounts'),
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });
  });

  describe('Post Methods', () => {
    it('should create post', async () => {
      const mockResponse = {
        results: [
          {
            platform: 'twitter',
            userId: '123456',
            details: {
              id: 'post-123',
              success: true,
            },
          },
        ],
        summary: {
          total: 1,
          succeeded: 1,
          failed: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.createPost({
        targets: [{ platform: 'twitter', userId: '123456' }],
        content: [{ text: 'Hello world' }],
      }));

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/post'),
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should delete post', async () => {
      const mockResponse = {
        results: [
          {
            platform: 'twitter',
            userId: '123456',
            details: {
              id: 'post-123',
              success: true,
            },
          },
        ],
        summary: {
          total: 1,
          succeeded: 1,
          failed: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.deletePost({
        platform: 'twitter',
        userId: '123456',
        postId: 'post-123',
      }));

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/post'),
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });

    it('should like post', async () => {
      const mockResponse = {
        results: [
          {
            platform: 'twitter',
            userId: '123456',
            details: {
              id: 'post-123',
              success: true,
            },
          },
        ],
        summary: {
          total: 1,
          succeeded: 1,
          failed: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.likePost({
        platform: 'twitter',
        userId: '123456',
        postId: 'post-123',
      }));

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/post/like'),
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  describe('Activity Methods', () => {
    it('should get leaderboard', async () => {
      const mockResponse = {
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
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.getLeaderboard());

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/activity'),
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('should get account activity', async () => {
      const mockResponse = {
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
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.getAccountActivity('test.near', {}));

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/activity/test.near'),
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });
  });

  describe('System Methods', () => {
    it('should get rate limits', async () => {
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

      const result = await Effect.runPromise(service.getRateLimits());

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rate-limit'),
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('should get health status', async () => {
      const mockResponse = {
        status: 'ok',
        timestamp: '2023-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.getHealthStatus());

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            errors: [{ message: 'Authentication failed', code: 'AUTH_ERROR' }],
          }),
      });

      await expect(
        Effect.runPromise(service.authorizeNearAccount()),
      ).rejects.toThrow('Authentication failed');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        Effect.runPromise(service.getHealthStatus()),
      ).rejects.toThrow('Network error');
    });
  });
});
