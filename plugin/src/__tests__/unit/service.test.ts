import { Effect } from "every-plugin/effect";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CrosspostService } from "../../service";
import type { NearAuthData } from "../../types/auth";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CrosspostService", () => {
  const mockNearAuthData: NearAuthData = {
    account_id: "test.near",
    public_key: "ed25519:test",
    signature: "test-signature",
    message: "test-message",
    nonce: [1, 2, 3],
    recipient: "crosspost.near",
  };

  const service = new CrosspostService(
    "https://api.crosspost.near",
    mockNearAuthData,
    5000
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Auth Methods", () => {
    it("should authorize NEAR account", async () => {
      const mockResponse = {
        data: {
          signerId: "test.near",
          isAuthorized: true,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.authorizeNearAccount());

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/authorize/near"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Authorization": expect.stringContaining("Bearer"),
          }),
        })
      );
    });

    it("should get NEAR authorization status", async () => {
      const mockResponse = {
        data: {
          signerId: "test.near",
          isAuthorized: true,
          authorizedAt: "2023-01-01T00:00:00Z",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.getNearAuthorizationStatus());

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/authorize/near/status"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "X-Near-Account": "test.near",
          }),
        })
      );
    });

    it("should login to platform", async () => {
      const mockResponse = {
        data: {
          url: "https://twitter.com/oauth/authorize?client_id=test",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(
        service.loginToPlatform("twitter", { redirect: false })
      );

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/twitter/login"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ redirect: false }),
        })
      );
    });

    it("should refresh token", async () => {
      const mockResponse = {
        data: {
          platform: "twitter",
          userId: "123456",
          status: { message: "Token refreshed", code: "success" },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.refreshToken("twitter", "123456"));

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/twitter/refresh"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ userId: "123456" }),
        })
      );
    });

    it("should get connected accounts", async () => {
      const mockResponse = {
        data: {
          accounts: [
            {
              platform: "twitter",
              userId: "123456",
              connectedAt: "2023-01-01T00:00:00Z",
              profile: null,
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.getConnectedAccounts());

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/accounts"),
        expect.objectContaining({
          method: "GET",
        })
      );
    });
  });

  describe("Post Methods", () => {
    it("should create post", async () => {
      const mockResponse = {
        data: {
          summary: { total: 1, succeeded: 1, failed: 0 },
          results: [
            {
              platform: "twitter",
              userId: "123456",
              details: { id: "post-123" },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request = {
        targets: [{ platform: "twitter", userId: "123456" }],
        content: [{ text: "Hello world!" }],
      };

      const result = await Effect.runPromise(service.createPost(request));

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/post"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(request),
        })
      );
    });

    it("should delete post", async () => {
      const mockResponse = {
        data: {
          summary: { total: 1, succeeded: 1, failed: 0 },
          results: [
            {
              platform: "twitter",
              userId: "123456",
              details: { success: true, id: "post-123" },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request = {
        targets: [{ platform: "twitter", userId: "123456" }],
        posts: [{ platform: "twitter", userId: "123456", postId: "post-123" }],
      };

      const result = await Effect.runPromise(service.deletePost(request));

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/post"),
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify(request),
        })
      );
    });

    it("should like post", async () => {
      const mockResponse = {
        data: {
          summary: { total: 1, succeeded: 1, failed: 0 },
          results: [
            {
              platform: "twitter",
              userId: "123456",
              details: { success: true, id: "post-123" },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request = {
        targets: [{ platform: "twitter", userId: "123456" }],
        platform: "twitter",
        postId: "post-123",
      };

      const result = await Effect.runPromise(service.likePost(request));

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/post/like"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(request),
        })
      );
    });
  });

  describe("Activity Methods", () => {
    it("should get leaderboard", async () => {
      const mockResponse = {
        data: {
          timeframe: "week",
          entries: [
            {
              signerId: "test.near",
              totalPosts: 10,
              totalLikes: 100,
              totalReposts: 5,
              totalReplies: 3,
              totalQuotes: 2,
              totalScore: 120,
              rank: 1,
              lastActive: "2023-01-01T00:00:00Z",
              firstPostTimestamp: "2023-01-01T00:00:00Z",
            },
          ],
          generatedAt: "2023-01-01T00:00:00Z",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.getLeaderboard());

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/activity"),
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("should get account activity", async () => {
      const mockResponse = {
        data: {
          signerId: "test.near",
          timeframe: "week",
          totalPosts: 10,
          totalLikes: 100,
          totalReposts: 5,
          totalReplies: 3,
          totalQuotes: 2,
          totalScore: 120,
          rank: 1,
          lastActive: "2023-01-01T00:00:00Z",
          platforms: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.getAccountActivity("test.near"));

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/activity/test.near"),
        expect.objectContaining({
          method: "GET",
        })
      );
    });
  });

  describe("System Methods", () => {
    it("should get rate limits", async () => {
      const mockResponse = {
        data: {
          limits: {
            post: { remaining: 100, reset: "2023-01-01T00:00:00Z" },
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.getRateLimits());

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/rate-limit"),
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("should get health status", async () => {
      const mockResponse = {
        data: {
          status: "ok",
          timestamp: "2023-01-01T00:00:00Z",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await Effect.runPromise(service.getHealthStatus());

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/health"),
        expect.objectContaining({
          method: "GET",
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors", async () => {
      const mockErrorResponse = {
        errors: [
          {
            message: "Authentication failed",
            code: "AUTH_ERROR",
            details: { platform: "twitter" },
            recoverable: false,
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockErrorResponse),
      });

      await expect(
        Effect.runPromise(service.authorizeNearAccount())
      ).rejects.toThrow("Authentication failed");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        Effect.runPromise(service.getHealthStatus())
      ).rejects.toThrow("Network error");
    });
  });
});
