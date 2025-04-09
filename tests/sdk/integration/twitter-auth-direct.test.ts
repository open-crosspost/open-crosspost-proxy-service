import { describe, it, beforeEach, afterEach } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import { ApiErrorCode, Platform, PlatformError } from "@crosspost/types";
import { TwitterAuth } from "../../../src/infrastructure/platform/twitter/twitter-auth.ts";
import { KvStore } from "../../../src/utils/kv-store.utils.ts";
import * as twitterApiModule from "twitter-api-v2";

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

// Save original TwitterApi
const OriginalTwitterApi = twitterApiModule.TwitterApi;

describe("Twitter Auth Direct", () => {
  let twitterAuth: TwitterAuth;
  let mockKvStore: Map<string, any> = new Map();
  let mockGenerateAuthLink: any;
  let mockLoginWithOAuth2: any;
  let mockMe: any;

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

    // Create mock TwitterApi
    mockGenerateAuthLink = jest.fn().mockReturnValue({
      url: "https://x.com/i/oauth2/authorize?mock=true",
      codeVerifier: "mock-code-verifier",
      state: "mock-state",
    });

    mockLoginWithOAuth2 = jest.fn().mockResolvedValue({
      client: {
        v2: {
          me: () => mockMe(),
        },
      },
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresIn: 7200,
    });

    mockMe = jest.fn().mockResolvedValue({
      data: {
        id: "mock-user-id",
        name: "Mock User",
        username: "mockuser",
      },
    });

    // Mock TwitterApi
    (twitterApiModule as any).TwitterApi = jest.fn().mockImplementation(() => {
      return {
        generateOAuth2AuthLink: mockGenerateAuthLink,
        loginWithOAuth2: mockLoginWithOAuth2,
      };
    });

    // Create Twitter auth instance
    twitterAuth = new TwitterAuth(mockEnv as any);
    
    // Mock the profile and token storage
    (twitterAuth as any).twitterProfile = {
      fetchUserProfile: jest.fn().mockResolvedValue({}),
    };
    
    (twitterAuth as any).tokenStorage = {
      saveTokens: jest.fn().mockResolvedValue({}),
      getTokens: jest.fn().mockResolvedValue({
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        expiresAt: Date.now() + 3600000,
        scope: ["tweet.read", "tweet.write"],
        tokenType: "oauth2",
      }),
      deleteTokens: jest.fn().mockResolvedValue({}),
    };
    
    // Mock linkAccountToNear
    (twitterAuth as any).linkAccountToNear = jest.fn().mockResolvedValue({});
  });

  afterEach(() => {
    // Restore original KvStore methods
    KvStore.get = originalKvGet;
    KvStore.set = originalKvSet;
    KvStore.delete = originalKvDelete;
    
    // Restore original TwitterApi
    (twitterApiModule as any).TwitterApi = OriginalTwitterApi;
    
    // Clear all mocks
    jest.clearAllMocks();
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
      expect(result.authUrl).toBe("https://x.com/i/oauth2/authorize?mock=true");
      expect(result.state).toBe("mock-state");
      expect(result.codeVerifier).toBe("mock-code-verifier");
      
      // Verify state is stored in KV
      const stateKey = `auth:mock-state`;
      const storedState = mockKvStore.get(stateKey);
      expect(storedState).toBeDefined();
      expect(storedState.signerId).toBe(signerId);
      expect(storedState.successUrl).toBe(successUrl);
      expect(storedState.errorUrl).toBe(errorUrl);
      
      // Verify TwitterApi was called with correct params
      expect(twitterApiModule.TwitterApi).toHaveBeenCalledWith({
        clientId: mockEnv.TWITTER_CLIENT_ID,
        clientSecret: mockEnv.TWITTER_CLIENT_SECRET,
      });
      
      // Verify generateOAuth2AuthLink was called with correct params
      expect(mockGenerateAuthLink).toHaveBeenCalledWith(
        redirectUri,
        expect.objectContaining({
          scope: expect.arrayContaining(["tweet.read", "tweet.write"]),
        })
      );
    });

    it("should throw error when auth link generation fails", async () => {
      // Arrange
      const signerId = "test.near";
      const redirectUri = "https://example.com/callback";
      const scopes = ["tweet.read", "tweet.write"];
      const successUrl = "https://example.com/success";
      const errorUrl = "https://example.com/error";
      
      // Mock error
      mockGenerateAuthLink.mockImplementation(() => {
        throw new Error("Failed to generate auth link");
      });

      // Act & Assert
      await expect(
        twitterAuth.initializeAuth(
          signerId,
          redirectUri,
          scopes,
          successUrl,
          errorUrl
        )
      ).rejects.toThrow("Failed to generate auth link");
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

      // Act
      const result = await twitterAuth.handleCallback(code, state);

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe("mock-user-id");
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBe("mock-access-token");
      expect(result.tokens.refreshToken).toBe("mock-refresh-token");
      expect(result.successUrl).toBe(authState.successUrl);

      // Verify state is deleted from KV
      const storedState = await KvStore.get(["auth", state]);
      expect(storedState).toBeNull();
      
      // Verify TwitterApi was called with correct params
      expect(twitterApiModule.TwitterApi).toHaveBeenCalledWith({
        clientId: mockEnv.TWITTER_CLIENT_ID,
        clientSecret: mockEnv.TWITTER_CLIENT_SECRET,
      });
      
      // Verify loginWithOAuth2 was called with correct params
      expect(mockLoginWithOAuth2).toHaveBeenCalledWith({
        code,
        codeVerifier: authState.codeVerifier,
        redirectUri: authState.redirectUri,
      });
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
      
      // Mock error
      mockLoginWithOAuth2.mockImplementation(() => {
        throw new Error("Failed to exchange token");
      });

      // Act & Assert
      await expect(twitterAuth.handleCallback(code, state)).rejects.toThrow("Failed to exchange token");
    });
  });
});
