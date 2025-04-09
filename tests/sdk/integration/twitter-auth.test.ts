import { describe, it, beforeEach, afterEach } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import { ApiErrorCode, Platform, PlatformError } from "@crosspost/types";
import { TwitterAuth } from "../../../src/infrastructure/platform/twitter/twitter-auth.ts";
import { TwitterClientMock } from "../../mocks/twitter/twitter-client-mock.ts";
import { KvStore } from "../../../src/utils/kv-store.utils.ts";

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

describe("Twitter Auth", () => {
  let twitterAuth: TwitterAuth;
  let twitterClientMock: TwitterClientMock;
  let mockKvStore: Map<string, any> = new Map();

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

    // Create mock Twitter client
    twitterClientMock = new TwitterClientMock(mockEnv);

    // Create Twitter auth instance with mock client
    twitterAuth = new TwitterAuth(mockEnv as any);
    // Replace the internal Twitter client with our mock
    (twitterAuth as any).twitterClient = twitterClientMock;
  });

  afterEach(() => {
    // Restore original KvStore methods
    KvStore.get = originalKvGet;
    KvStore.set = originalKvSet;
    KvStore.delete = originalKvDelete;
  });

  describe("initializeAuth", () => {
    it("should initialize authentication flow successfully", async () => {
      // Arrange
      const signerId = "test.near";
      const redirectUri = "https://example.com/callback";
      const scopes = ["tweet.read", "tweet.write"];
      const successUrl = "https://example.com/success";
      const errorUrl = "https://example.com/error";

      // Act
      const result = await twitterAuth.initializeAuth(
        signerId,
        redirectUri,
        scopes,
        successUrl,
        errorUrl
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.authUrl).toContain("oauth2/authorize");
      expect(result.authUrl).toContain(encodeURIComponent(redirectUri));
      expect(result.state).toBeDefined();
      
      // Verify state is stored in KV
      const stateKey = `auth:${result.state}`;
      const storedState = mockKvStore.get(stateKey);
      expect(storedState).toBeDefined();
      expect(storedState.signerId).toBe(signerId);
      expect(storedState.successUrl).toBe(successUrl);
      expect(storedState.errorUrl).toBe(errorUrl);
    });

    it("should throw error when client fails to generate auth URL", async () => {
      // Arrange
      const signerId = "test.near";
      const redirectUri = "https://example.com/callback";
      const scopes = ["tweet.read", "tweet.write"];
      const successUrl = "https://example.com/success";
      const errorUrl = "https://example.com/error";

      // Create client with error scenario
      const errorClientMock = new TwitterClientMock(mockEnv, "getAuthUrl");
      (twitterAuth as any).twitterClient = errorClientMock;

      // Act & Assert
      await expect(
        twitterAuth.initializeAuth(
          signerId,
          redirectUri,
          scopes,
          successUrl,
          errorUrl
        )
      ).rejects.toThrow();
    });
  });

  describe("getAuthState", () => {
    it("should retrieve auth state successfully", async () => {
      // Arrange
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

      // Act
      const result = await twitterAuth.getAuthState(state);

      // Assert
      expect(result).toBeDefined();
      expect(result?.successUrl).toBe(authState.successUrl);
      expect(result?.errorUrl).toBe(authState.errorUrl);
      expect(result?.signerId).toBe(authState.signerId);
    });

    it("should return null for invalid state", async () => {
      // Arrange
      const state = "invalid-state";

      // Act
      const result = await twitterAuth.getAuthState(state);

      // Assert
      expect(result).toBeNull();
    });
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

      // Mock the necessary methods to avoid real API calls
      const originalExchangeCodeForToken = (twitterAuth as any).twitterClient.exchangeCodeForToken;
      (twitterAuth as any).twitterClient.exchangeCodeForToken = async () => {
        return {
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          expiresAt: Date.now() + 3600000,
          scope: ["tweet.read", "tweet.write"],
          tokenType: "oauth2",
        };
      };
      
      // Mock the linkAccountToNear function
      (twitterAuth as any).linkAccountToNear = async () => {};

      // Mock the fetchUserProfile method and tokenStorage
      (twitterAuth as any).twitterProfile = {
        fetchUserProfile: async () => {},
      };
      
      (twitterAuth as any).tokenStorage = {
        saveTokens: async () => {},
        getTokens: async () => ({}),
        deleteTokens: async () => {},
      };

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

      // Restore original methods
      (twitterAuth as any).twitterClient.exchangeCodeForToken = originalExchangeCodeForToken;
    });

    it("should throw error for invalid state", async () => {
      // Arrange
      const code = "mock-code";
      const state = "invalid-state";

      // Act & Assert
      await expect(twitterAuth.handleCallback(code, state)).rejects.toThrow();
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

      // Create client with error scenario
      const errorClientMock = new TwitterClientMock(mockEnv, "exchangeCodeForToken");
      (twitterAuth as any).twitterClient = errorClientMock;

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

      // Act
      const result = await twitterAuth.refreshToken(userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe("mock-refreshed-access-token");
      expect(result.refreshToken).toBe("mock-refreshed-refresh-token");
    });

    it("should throw error when no refresh token is available", async () => {
      // Arrange
      const userId = "mock-user-id";
      
      // Mock the tokenStorage.getTokens method to return tokens without refreshToken
      (twitterAuth as any).tokenStorage = {
        getTokens: async () => ({
          accessToken: "mock-access-token",
          expiresAt: Date.now() - 1000, // Expired
          scope: ["tweet.read", "tweet.write"],
          tokenType: "oauth2",
        }),
        saveTokens: async () => {},
        deleteTokens: async () => {},
      };

      // Act & Assert
      try {
        await twitterAuth.refreshToken(userId);
        // If we get here, the test should fail
        expect(false).toBe(true); // This will fail if no error is thrown
      } catch (error) {
        expect(error).toBeInstanceOf(PlatformError);
        expect((error as PlatformError).code).toBe(ApiErrorCode.UNAUTHORIZED);
        expect((error as PlatformError).platform).toBe(Platform.TWITTER);
        expect((error as PlatformError).recoverable).toBe(false);
      }
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

      // Create client with error scenario
      const errorClientMock = new TwitterClientMock(mockEnv, "refreshPlatformToken");
      (twitterAuth as any).twitterClient = errorClientMock;

      // Act & Assert
      await expect(twitterAuth.refreshToken(userId)).rejects.toThrow();
    });
  });

  describe("revokeToken", () => {
    it("should revoke token successfully", async () => {
      // Arrange
      const userId = "mock-user-id";
      
      // Mock the tokenStorage methods
      (twitterAuth as any).tokenStorage = {
        getTokens: async () => ({
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          expiresAt: Date.now() + 3600000,
          scope: ["tweet.read", "tweet.write"],
          tokenType: "oauth2",
        }),
        deleteTokens: async () => {},
      };

      // Act
      const result = await twitterAuth.revokeToken(userId);

      // Assert
      expect(result).toBe(true);
    });

    it("should handle error when token revocation fails but still delete tokens", async () => {
      // Arrange
      const userId = "mock-user-id";
      
      // Mock the tokenStorage methods
      (twitterAuth as any).tokenStorage = {
        getTokens: async () => ({
          accessToken: "mock-access-token",
          tokenType: "oauth2",
        }),
        deleteTokens: async () => {},
      };

      // Create client with error scenario
      const errorClientMock = new TwitterClientMock(mockEnv, "revokePlatformToken");
      (twitterAuth as any).twitterClient = errorClientMock;

      // Act
      const result = await twitterAuth.revokeToken(userId);

      // Assert - should still return true because we delete tokens locally even if API call fails
      expect(result).toBe(true);
    });
  });
});
