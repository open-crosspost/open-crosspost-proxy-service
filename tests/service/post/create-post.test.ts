import { ApiErrorCode, Platform } from "@crosspost/types";
import { assertEquals, assertExists } from "jsr:@std/assert";
import { afterEach, beforeEach, describe, it } from "jsr:@std/testing/bdd";
import * as mock from "jsr:@std/testing/mock";
import { Env } from "../../../src/config/env.ts";
import { CreateController } from "../../../src/controllers/post/create.controller.ts";
import { PostService } from "../../../src/domain/services/post.service.ts";
import { mockToken } from "../../mocks/near-auth-service-mock.ts";
import { tokenManagerMock } from "../../mocks/token-manager-mock.ts";
import { tokenStorageMock } from "../../mocks/token-storage-mock.ts";
import { createMockTwitterApi } from "../../mocks/twitter/twitter-api-mock.ts";
import { TwitterClientMock } from "../../mocks/twitter/twitter-client-mock.ts";
import { createMockContext } from "../../utils/test-utils.ts";

// Create a mock Env object for PostService
const mockEnv: Env = {
  TWITTER_CLIENT_ID: "mock-client-id",
  TWITTER_CLIENT_SECRET: "mock-client-secret",
  TWITTER_API_KEY: "mock-api-key",
  TWITTER_API_SECRET: "mock-api-secret",
  TWITTER_ACCESS_TOKEN: "mock-access-token",
  TWITTER_ACCESS_SECRET: "mock-access-secret",
  ENCRYPTION_KEY: "mock-encryption-key-that-is-long-enough",
  ALLOWED_ORIGINS: "*",
  ENVIRONMENT: "test",
};

describe("Post Creation Controller", () => {
  const originalEnv: Record<string, string | undefined> = {};
  let mockTwitterClient: TwitterClientMock;
  let postService: PostService;
  let createController: CreateController;

  // Setup before each test
  beforeEach(() => {
    // Clear all mocks before each test
    mock.restore();

    // Save original environment variables
    const envVars = [
      "TWITTER_CLIENT_ID",
      "TWITTER_CLIENT_SECRET",
      "ENCRYPTION_KEY",
      "ALLOWED_ORIGINS",
      "API_KEYS",
      "ENVIRONMENT",
    ];

    for (const key of envVars) {
      originalEnv[key] = Deno.env.get(key);
      const value = mockEnv[key as keyof typeof mockEnv];
      if (value !== undefined) {
        Deno.env.set(key, value);
      }
    }

    // Create mock Twitter client
    mockTwitterClient = new TwitterClientMock(mockEnv);

    // Create post service with mock Twitter client
    postService = new PostService(mockEnv);

    // Replace the internal Twitter client with our mock
    (postService as any).twitterClient = mockTwitterClient;

    // Replace the token manager in the Twitter client with our mock
    (mockTwitterClient as any).tokenManager = tokenManagerMock;

    // Create post controller with mock post service
    createController = new CreateController();

    // Replace the internal post service with our mock
    (createController as any).postService = postService;

    // Mock the authService.hasAccess method to return true
    mock.stub((createController as any).authService, "hasAccess", () => {
      return Promise.resolve(true);
    });

    // Mock the rateLimitService.canPerformAction method to return true
    mock.stub((createController as any).rateLimitService, "canPerformAction", () => {
      return Promise.resolve(true);
    });

    // Mock the authService.getTokensForUser method to return the mock token
    mock.stub((createController as any).authService, "getTokensForUser", () => {
      return Promise.resolve(mockToken);
    });

    // Set up the mock tokens
    tokenStorageMock.setToken("test-user-id", "twitter", mockToken);

  });

  // Cleanup after each test
  afterEach(() => {
    // Restore original environment variables
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }

    // Clear all mocks
    mock.restore();
    tokenManagerMock.clear();

    // Reset the default tokens
    tokenManagerMock.setToken("test-user-id", "twitter", mockToken);
  });

  it("should create a post successfully", async () => {
    // Mock the getClientForUser method to return our mock Twitter API
    mock.stub(mockTwitterClient, "getClientForUser", (_userId) => {
      return Promise.resolve(createMockTwitterApi("test-user-id"));
    });

    // Create a mock context with the request body
    const mockContext = createMockContext({
      signerId: "test.near",
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: "test-user-id"
          }
        ],
        content: "Test post from API",
      },
    });

    // Call the controller
    const response = await createController.handle(mockContext);

    // Parse the response
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.success);
    assertEquals(responseBody.success, true);
    assertExists(responseBody.data);
  });

  it("should handle rate limit errors", async () => {
    // Mock the getClientForUser method to return our rate-limited mock API
    mock.stub(mockTwitterClient, "getClientForUser", (_userId) => {
      return Promise.resolve(createMockTwitterApi("test-user-id", "rate_limit"));
    });

    // Create a mock context with the request body
    const mockContext = createMockContext({
      signerId: "test.near",
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: "test-user-id"
          }
        ],
        content: "Test post that will hit rate limit",
      },
    });

    // Call the controller and expect it to handle the rate limit error
    const response = await createController.handle(mockContext);

    // Parse the response
    const responseBody = await response.json();

    // Verify the response indicates a rate limit error
    assertEquals(response.status, 429);
    assertExists(responseBody.errors);
    assertEquals(responseBody.errors[0].errorCode, ApiErrorCode.RATE_LIMITED);
  });

  it("should handle authentication errors", async () => {
    // Mock the getClientForUser method to return our auth-error mock API
    mock.stub(mockTwitterClient, "getClientForUser", (_userId) => {
      return Promise.resolve(createMockTwitterApi("test-user-id", "auth_error"));
    });

    // Create a mock context with the request body
    const mockContext = createMockContext({
      signerId: "test.near",
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: "test-user-id"
          }
        ],
        content: "Test post that will hit auth error",
      },
    });

    // Call the controller and expect it to handle the auth error
    const response = await createController.handle(mockContext);

    // Parse the response
    const responseBody = await response.json();

    // Verify the response indicates an authentication error
    assertEquals(response.status, 401);
    assertExists(responseBody.errors);
    assertEquals(responseBody.errors[0].errorCode, ApiErrorCode.UNAUTHORIZED);
  });

  it("should handle content policy violations", async () => {
    // Mock the getClientForUser method to return our content-policy-error mock API
    mock.stub(mockTwitterClient, "getClientForUser", (_userId) => {
      return Promise.resolve(createMockTwitterApi("test-user-id", "content_policy"));
    });

    // Create a mock context with the request body
    const mockContext = createMockContext({
      signerId: "test.near",
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: "test-user-id"
          }
        ],
        content: "Test post that will violate content policy",
      },
    });

    // Call the controller and expect it to handle the content policy error
    const response = await createController.handle(mockContext);

    // Parse the response
    const responseBody = await response.json();

    // Verify the response indicates a content policy violation
    assertEquals(response.status, 400);
    assertExists(responseBody.errors);
    assertEquals(responseBody.errors[0].errorCode, ApiErrorCode.CONTENT_POLICY_VIOLATION);
  });
});
