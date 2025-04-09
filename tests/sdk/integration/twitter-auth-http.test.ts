import { describe, it, beforeEach, afterEach } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/testing";
import { mock } from "jsr:@std/testing/mock";
import { ApiErrorCode, Platform, PlatformError } from "@crosspost/types";
import { TwitterAuth } from "../../../src/infrastructure/platform/twitter/twitter-auth.ts";
import { KvStore } from "../../../src/utils/kv-store.utils.ts";
import { linkAccountToNear } from "../../../src/utils/account-linking.utils.ts";

// Mock KvStore for testing
const originalKvGet = KvStore.get;
const originalKvSet = KvStore.set;
const originalKvDelete = KvStore.delete;

// Mock environment
const mockEnv = {
  TWITTER_CLIENT_ID: "mock-client-id",
  TWITTER_CLIENT_SECRET: "mock-client-secret",
  ENCRYPTION_KEY: "mock-encryption-key",
};

// Mock linkAccountToNear
const originalLinkAccountToNear = linkAccountToNear;

describe("Twitter Auth HTTP", () => {
  let twitterAuth: TwitterAuth;
  let mockKvStore: Map<string, any> = new Map();
  let fetchMock: any;

  beforeEach(() => {
    // Reset mock KV store
    mockKvStore = new Map();

    // Mock KvStore methods
    KvStore.get = async <T>(key: string[]): Promise<T | null> => {
      const keyString = key.join(":");
      return mockKvStore.get(keyString) as T || null;
    };

    KvStore.set = async <T>(
      key: string[],
      value: T,
      options?: { expireIn?: number }
    ): Promise<void> => {
      const keyString = key.join(":");
      mockKvStore.set(keyString, value);
    };

    KvStore.delete = async (key: string[]): Promise<void> => {
      const keyString = key.join(":");
      mockKvStore.delete(keyString);
    };

    // Mock linkAccountToNear
    (globalThis as any).linkAccountToNear = async () => {};

    // Create Twitter auth instance
    twitterAuth = new TwitterAuth(mockEnv as any);
    
    // Mock the profile and token storage
    (twitterAuth as any).twitterProfile = {
      fetchUserProfile: async () => {},
    };
    
    (twitterAuth as any).tokenStorage = {
      saveTokens: async () => {},
      getTokens: async () => ({
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiresAt: Date.now() + 3600000,
        scope: ["tweet.read", "tweet.write"],
        tokenType: "oauth2",
      }),
      deleteTokens: async () => {},
    };

    // Mock fetch
    fetchMock = mock.method(globalThis, "fetch");
  });

  afterEach(() => {
    // Restore original KvStore methods
    KvStore.get = originalKvGet;
    KvStore.set = originalKvSet;
    KvStore.delete = originalKvDelete;
    
    // Restore original linkAccountToNear
    (globalThis as any).linkAccountToNear = originalLinkAccountToNear;
    
    // Restore fetch
    mock.restore();
  });

  describe("handleCallback", () => {
    it("should handle callback successfully", async () => {
      // Arrange
      const code = "mock-code";
      const state = "mock-state";
      const authState = {
        redirectUri: "https://example.com/callback",
        codeVerifier: "mock-code-verifier",
        state,
        createdAt: Date.now(),
        successUrl: "https://example.com/success",
        errorUrl: "https://example.com/error",
        signerId: "test.near",
      };

      // Store auth state in mock KV
      await KvStore.set(["auth", state], authState);

      // Mock token exchange response
      fetchMock.mock(
        "https://api.twitter.com/2/oauth2/token",
        new Response(
          JSON.stringify({
            token_type: "bearer",
            expires_in: 7200,
            access_token: "mock-access-token",
            scope: "tweet.read tweet.write users.read offline.access like.write",
            refresh_token: "mock-refresh-token",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );

      // Mock user info response
      fetchMock.mock(
        "https://api.twitter.com/2/users/me",
        new Response(
          JSON.stringify({
            data: {
              id: "mock-user-id",
              name: "Mock User",
              username: "mockuser",
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );

      // Act
      const result = await twitterAuth.handleCallback(code, state);

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.successUrl).toBe(authState.successUrl);

      // Verify state is deleted from KV
      const storedState = await KvStore.get(["auth", state]);
      expect(storedState).toBeNull();
    });

    it("should throw error for invalid state", async () => {
      // Arrange
      const code = "mock-code";
      const state = "invalid-state";

      // Act & Assert
      await expect(twitterAuth.handleCallback(code, state)).rejects.toThrow("Invalid or expired state");
    });

    it("should throw error when token exchange fails", async () => {
      // Arrange
      const code = "mock-code";
      const state = "mock-state";
      const authState = {
        redirectUri: "https://example.com/callback",
        codeVerifier: "mock-code-verifier",
        state,
        createdAt: Date.now(),
        successUrl: "https://example.com/success",
        errorUrl: "https://example.com/error",
        signerId: "test.near",
      };

      // Store auth state in mock KV
      await KvStore.set(["auth", state], authState);
      
      // Mock token exchange error response
      fetchMock.mock(
        "https://api.twitter.com/2/oauth2/token",
        new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Invalid authorization code",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );

      // Act & Assert
      await expect(twitterAuth.handleCallback(code, state)).rejects.toThrow();
    });
  });

  describe("refreshToken", () => {
    it("should refresh token successfully", async () => {
      // Arrange
      const userId = "mock-user-id";
      
      // Mock the tokenStorage.getTokens method
      (twitterAuth as any).tokenStorage = {
        getTokens: async () => ({
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          expiresAt: Date.now() - 1000, // Expired
          scope: ["tweet.read", "tweet.write"],
          tokenType: "oauth2",
        }),
        saveTokens: async () => {},
        deleteTokens: async () => {},
      };

      // Mock token refresh response
      fetchMock.mock(
        "https://api.twitter.com/2/oauth2/token",
        new Response(
          JSON.stringify({
            token_type: "bearer",
            expires_in: 7200,
            access_token: "mock-refreshed-access-token",
            scope: "tweet.read tweet.write users.read offline.access like.write",
            refresh_token: "mock-refreshed-refresh-token",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );

      // Act
      const result = await twitterAuth.refreshToken(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it("should throw error when token refresh fails", async () => {
      // Arrange
      const userId = "mock-user-id";
      
      // Mock the tokenStorage.getTokens method
      (twitterAuth as any).tokenStorage = {
        getTokens: async () => ({
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          expiresAt: Date.now() - 1000, // Expired
          scope: ["tweet.read", "tweet.write"],
          tokenType: "oauth2",
        }),
        saveTokens: async () => {},
        deleteTokens: async () => {},
      };

      // Mock token refresh error response
      fetchMock.mock(
        "https://api.twitter.com/2/oauth2/token",
        new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Invalid refresh token",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );

      // Act & Assert
      await expect(twitterAuth.refreshToken(userId)).rejects.toThrow();
    });
  });
});
