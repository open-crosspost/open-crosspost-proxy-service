import { ApiErrorCode, Platform, PlatformError } from "@crosspost/types";
import { assertEquals, assertExists } from "jsr:@std/assert";
import { beforeEach, describe, it } from "jsr:@std/testing/bdd";
import { CreateController } from "../../../src/controllers/post/create.controller.ts";
import {
  createAuthErrorServices,
  createMockContext,
  createMockServices,
  createPlatformErrorServices,
  createRateLimitErrorServices
} from "../../utils/test-utils.ts";

describe("Post Creation Controller", () => {
  let controller: CreateController;
  let services: ReturnType<typeof createMockServices>;

  // Setup before each test
  beforeEach(() => {
    // Create mock services
    services = createMockServices();

    // Create the controller instance with mock dependencies
    controller = new CreateController(
      services.postService,
      services.rateLimitService,
      services.activityTrackingService,
      services.authService
    );
  });

  it("should create a post successfully", async () => {
    // Create a mock context with the request body
    const context = createMockContext({
      signerId: "test.near",
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: "test-user-id",
          },
        ],
        content: "Test post from API",
      },
    });

    // Call the controller
    const response = await controller.handle(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertExists(responseBody.data.results);
    assertEquals(responseBody.data.results.length, 1);
    assertEquals(responseBody.data.errors.length, 0);
    assertEquals(responseBody.data.results[0].platform, Platform.TWITTER);
    assertEquals(responseBody.data.results[0].userId, "test-user-id");
    assertExists(responseBody.data.results[0].postId);
  });

  it("should handle rate limit errors from RateLimitService", async () => {
    // Create services with rate limit error
    const rateLimitServices = createRateLimitErrorServices();

    // Create a controller with the rate-limited services
    const rateLimitController = new CreateController(
      rateLimitServices.postService,
      rateLimitServices.rateLimitService,
      rateLimitServices.activityTrackingService,
      rateLimitServices.authService
    );

    // Create a mock context
    const rateLimitContext = createMockContext({
      signerId: "test.near",
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: "test-user-id",
          },
        ],
        content: "Test post that will hit rate limit",
      },
    });

    // Call the controller
    const rateLimitResponse = await rateLimitController.handle(rateLimitContext);
    const rateLimitResponseBody = await rateLimitResponse.json();

    // Verify the response indicates a rate limit error
    assertEquals(rateLimitResponse.status, 429);
    assertEquals(rateLimitResponseBody.data.results.length, 0);
    assertExists(rateLimitResponseBody.data.errors);
    assertEquals(rateLimitResponseBody.data.errors.length, 1);
    assertEquals(rateLimitResponseBody.data.errors[0].errorCode, ApiErrorCode.RATE_LIMITED);
    assertEquals(rateLimitResponseBody.data.errors[0].platform, Platform.TWITTER);
    assertEquals(rateLimitResponseBody.data.errors[0].userId, "test-user-id");
  });

  it("should handle authentication errors from AuthService", async () => {
    // Create services with authentication error
    const authErrorServices = createAuthErrorServices();

    // Create a controller with the auth error services
    const authErrorController = new CreateController(
      authErrorServices.postService,
      authErrorServices.rateLimitService,
      authErrorServices.activityTrackingService,
      authErrorServices.authService
    );

    // Create a mock context
    const authErrorContext = createMockContext({
      signerId: "test.near",
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: "test-user-id",
          },
        ],
        content: "Test post with auth error",
      },
    });

    // Call the controller
    const authErrorResponse = await authErrorController.handle(authErrorContext);
    const authErrorResponseBody = await authErrorResponse.json();

    // Verify the response indicates an authentication error
    assertEquals(authErrorResponse.status, 401);
    assertEquals(authErrorResponseBody.data.results.length, 0);
    assertExists(authErrorResponseBody.data.errors);
    assertEquals(authErrorResponseBody.data.errors.length, 1);
    assertEquals(authErrorResponseBody.data.errors[0].errorCode, ApiErrorCode.UNAUTHORIZED);
    assertEquals(authErrorResponseBody.data.errors[0].platform, Platform.TWITTER);
    assertEquals(authErrorResponseBody.data.errors[0].userId, "test-user-id");
  });

  it("should handle platform errors from PostService", async () => {
    // Create a platform error
    const platformError = new PlatformError(
      "Platform specific error",
      Platform.TWITTER,
      ApiErrorCode.PLATFORM_ERROR,
      false,
      undefined,
      500,
      "test-user-id"
    );

    // Create services with platform error
    const platformErrorServices = createPlatformErrorServices(platformError);

    // Create a controller with the platform error services
    const platformErrorController = new CreateController(
      platformErrorServices.postService,
      platformErrorServices.rateLimitService,
      platformErrorServices.activityTrackingService,
      platformErrorServices.authService
    );

    // Create a mock context
    const platformErrorContext = createMockContext({
      signerId: "test.near",
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: "test-user-id",
          },
        ],
        content: "Test post causing platform error",
      },
    });

    // Call the controller
    const platformErrorResponse = await platformErrorController.handle(platformErrorContext);
    const platformErrorResponseBody = await platformErrorResponse.json();

    // Verify the response indicates a platform error
    assertEquals(platformErrorResponse.status, 500);
    assertEquals(platformErrorResponseBody.data.results.length, 0);
    assertExists(platformErrorResponseBody.data.errors);
    assertEquals(platformErrorResponseBody.data.errors.length, 1);
    assertEquals(platformErrorResponseBody.data.errors[0].errorCode, ApiErrorCode.PLATFORM_ERROR);
    assertEquals(platformErrorResponseBody.data.errors[0].error, "Platform specific error");
    assertEquals(platformErrorResponseBody.data.errors[0].platform, Platform.TWITTER);
    assertEquals(platformErrorResponseBody.data.errors[0].userId, "test-user-id");
  });

  // Add more tests for other scenarios like multiple targets, content variations, etc.
});
