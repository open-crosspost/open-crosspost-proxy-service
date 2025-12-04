import { ApiErrorCode, Platform, PostContent, PostResult } from '@crosspost/types';
import { assertArrayIncludes, assertEquals, assertExists } from 'jsr:@std/assert';
import { beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { CreateController } from '../../../src/controllers/post/create.controller.ts';
import { PlatformError } from '../../../src/errors/platform-error.ts'; // Import PlatformError directly
import { createPlatformError } from '../../../src/errors/platform-error.ts';
import {
  createAuthErrorServices,
  createMockContext,
  createMockServices,
  createPlatformErrorServices,
  createRateLimitErrorServices,
} from '../../utils/test-utils.ts';

describe('Post Creation Controller', () => {
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
      services.authService,
    );
  });

  it('should create a post successfully', async () => {
    // Create a mock context with the request body
    const context = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: 'Test post from API' }],
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
    assertEquals(responseBody.data.results[0].userId, 'test-user-id');
    assertExists(responseBody.data.results[0].details);
    assertExists(responseBody.data.results[0].details.id);
    assertExists(responseBody.data.results[0].details.text);
    assertExists(responseBody.data.results[0].details.createdAt);
  });

  it('should handle rate limit errors from RateLimitService', async () => {
    // Create services with rate limit error
    const rateLimitServices = createRateLimitErrorServices();

    // Create a controller with the rate-limited services
    const rateLimitController = new CreateController(
      rateLimitServices.postService,
      rateLimitServices.rateLimitService,
      rateLimitServices.activityTrackingService,
      rateLimitServices.authService,
    );

    // Create a mock context
    const rateLimitContext = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: 'Test post that will hit rate limit' }],
      },
    });

    // Call the controller
    const rateLimitResponse = await rateLimitController.handle(rateLimitContext);
    const rateLimitResponseBody = await rateLimitResponse.json();

    // Verify the response indicates a rate limit error
    assertEquals(rateLimitResponse.status, 400);
    assertEquals(rateLimitResponseBody.success, false);
    assertExists(rateLimitResponseBody.errors);
    assertEquals(rateLimitResponseBody.errors.length, 1);
    assertEquals(rateLimitResponseBody.errors[0].code, ApiErrorCode.RATE_LIMITED);
    assertEquals(rateLimitResponseBody.errors[0].details.platform, Platform.TWITTER);
    assertEquals(rateLimitResponseBody.errors[0].details.userId, 'test-user-id');
  });

  it('should handle authentication errors from AuthService', async () => {
    // Create services with authentication error
    const authErrorServices = createAuthErrorServices();

    // Create a controller with the auth error services
    const authErrorController = new CreateController(
      authErrorServices.postService,
      authErrorServices.rateLimitService,
      authErrorServices.activityTrackingService,
      authErrorServices.authService,
    );

    // Create a mock context
    const authErrorContext = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: 'Test post with auth error' }],
      },
    });

    // Call the controller
    const authErrorResponse = await authErrorController.handle(authErrorContext);
    const authErrorResponseBody = await authErrorResponse.json();

    // Verify the response indicates an authentication error
    assertEquals(authErrorResponse.status, 400);
    assertEquals(authErrorResponseBody.success, false);
    assertExists(authErrorResponseBody.errors);
    assertEquals(authErrorResponseBody.errors.length, 1);
    assertEquals(authErrorResponseBody.errors[0].code, ApiErrorCode.UNAUTHORIZED);
    assertEquals(authErrorResponseBody.errors[0].details.platform, Platform.TWITTER);
    assertEquals(authErrorResponseBody.errors[0].details.userId, 'test-user-id');
  });

  it('should handle platform errors from PostService', async () => {
    // Create a platform error
    const platformError = createPlatformError(
      ApiErrorCode.PLATFORM_ERROR,
      'Platform specific error',
      Platform.TWITTER,
      { userId: 'test-user-id' },
    );

    // Create services with platform error
    const platformErrorServices = createPlatformErrorServices(platformError);

    // Create a controller with the platform error services
    const platformErrorController = new CreateController(
      platformErrorServices.postService,
      platformErrorServices.rateLimitService,
      platformErrorServices.activityTrackingService,
      platformErrorServices.authService,
    );

    // Create a mock context
    const platformErrorContext = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: 'Test post causing platform error' }],
      },
    });

    // Call the controller
    const platformErrorResponse = await platformErrorController.handle(platformErrorContext);
    const platformErrorResponseBody = await platformErrorResponse.json();

    // Verify the response indicates a platform error
    assertEquals(platformErrorResponse.status, 400);
    assertEquals(platformErrorResponseBody.success, false);
    assertExists(platformErrorResponseBody.errors);
    assertEquals(platformErrorResponseBody.errors.length, 1);
    assertEquals(platformErrorResponseBody.errors[0].code, ApiErrorCode.PLATFORM_ERROR);
    assertEquals(platformErrorResponseBody.errors[0].message, 'Platform specific error');
    assertEquals(platformErrorResponseBody.errors[0].details.platform, Platform.TWITTER);
    assertEquals(platformErrorResponseBody.errors[0].details.userId, 'test-user-id');
  });

  it('should handle multiple platform targets', async () => {
    // Create a mock context with multiple targets
    const context = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'twitter-user-id',
          },
          {
            platform: Platform.TWITTER,
            userId: 'twitter-user-id-2',
          },
        ],
        content: [{ text: 'Test post to multiple targets' }],
      },
    });

    // Call the controller
    const response = await controller.handle(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertExists(responseBody.data.results);
    assertEquals(responseBody.data.results.length, 2);
    assertEquals(responseBody.data.errors.length, 0);

    // Verify both targets were processed
    const userIds = responseBody.data.results.map((result: any) => result.userId);
    assertArrayIncludes(userIds, ['twitter-user-id', 'twitter-user-id-2']);
  });

  it('should handle content with media attachments', async () => {
    // Create a mock context with media attachments
    const context = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: 'Test post with media' }],
        mediaIds: ['media-1', 'media-2'],
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
  });

  it('should handle media upload errors', async () => {
    // Create a media upload error
    const mediaError = createPlatformError(
      ApiErrorCode.PLATFORM_ERROR,
      'Media upload failed',
      Platform.TWITTER,
      {
        userId: 'test-user-id',
        twitterErrorCode: 324,
      },
    );

    // Create services with media error
    const mediaErrorServices = createPlatformErrorServices(mediaError);

    // Create a controller with the media error services
    const mediaErrorController = new CreateController(
      mediaErrorServices.postService,
      mediaErrorServices.rateLimitService,
      mediaErrorServices.activityTrackingService,
      mediaErrorServices.authService,
    );

    // Create a mock context with media attachments
    const context = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: 'Test post with media that will fail' }],
        mediaIds: ['media-1'],
      },
    });

    // Call the controller
    const response = await mediaErrorController.handle(context);
    const responseBody = await response.json();

    // Verify the response indicates a media error
    assertEquals(response.status, 400);
    assertEquals(responseBody.success, false);
    assertExists(responseBody.errors);
    assertEquals(responseBody.errors.length, 1);
    assertEquals(responseBody.errors[0].code, ApiErrorCode.PLATFORM_ERROR);
    assertEquals(responseBody.errors[0].details.platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].details.userId, 'test-user-id');
    assertEquals(responseBody.errors[0].details.twitterErrorCode, 324);
  });

  it('should handle partial success with some targets failing', async () => {
    // Create a custom service mock where one target succeeds and one fails
    const mixedResultServices = createMockServices();

    // Override the postService to make it fail for specific user IDs
    const originalCreatePost = mixedResultServices.postService.createPost;
    (mixedResultServices.postService as any).createPost = (
      platform: Platform,
      userId: string,
      content: PostContent | PostContent[],
    ) => {
      if (userId === 'failing-user-id') {
        return Promise.reject(
          createPlatformError(
            ApiErrorCode.PLATFORM_ERROR,
            'Platform specific error',
            Platform.TWITTER,
            { userId },
          ),
        );
      }
      return originalCreatePost(platform, userId, content);
    };

    // Create a controller with the mixed result services
    const mixedResultController = new CreateController(
      mixedResultServices.postService,
      mixedResultServices.rateLimitService,
      mixedResultServices.activityTrackingService,
      mixedResultServices.authService,
    );

    // Create a mock context with multiple targets
    const context = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'successful-user-id',
          },
          {
            platform: Platform.TWITTER,
            userId: 'failing-user-id',
          },
        ],
        content: [{ text: 'Test post with mixed results' }],
      },
    });

    // Call the controller
    const response = await mixedResultController.handle(context);
    const responseBody = await response.json();

    // Verify the response shows partial success
    assertEquals(response.status, 207); // Multi-status
    assertExists(responseBody.data);
    assertExists(responseBody.data.results);
    assertExists(responseBody.data.errors);

    // Should have one success and one error
    assertEquals(responseBody.data.results.length, 1);
    assertEquals(responseBody.data.errors.length, 1);

    // Verify the successful result
    assertEquals(responseBody.data.results[0].userId, 'successful-user-id');

    // Verify the error
    assertEquals(responseBody.data.errors[0].details.userId, 'failing-user-id');
    assertEquals(responseBody.data.errors[0].code, ApiErrorCode.PLATFORM_ERROR);
  });

  it('should handle multiple rate limit errors in multi-target operations', async () => {
    // Create a custom service mock where multiple targets fail with the same error
    const errorServices = createMockServices();

    // Override the postService to make it fail for all user IDs with the same error
    (errorServices.postService as any).createPost = (
      platform: Platform,
      userId: string,
      content: PostContent | PostContent[],
    ) => {
      return Promise.reject(
        createPlatformError(
          ApiErrorCode.RATE_LIMITED,
          'Rate limit exceeded',
          platform,
          { userId, retryAfter: 3600 }, // 1 hour
          true,
        ),
      );
    };

    // Create a controller with the error services
    const errorController = new CreateController(
      errorServices.postService,
      errorServices.rateLimitService,
      errorServices.activityTrackingService,
      errorServices.authService,
    );

    // Create a mock context with multiple targets
    const context = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'user-id-1',
          },
          {
            platform: Platform.TWITTER,
            userId: 'user-id-2',
          },
          {
            platform: Platform.TWITTER,
            userId: 'user-id-3',
          },
        ],
        content: [{ text: 'Test post with multiple rate limit errors' }],
      },
    });

    // Call the controller
    const response = await errorController.handle(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 400); // Rate limited
    assertEquals(responseBody.success, false);
    assertExists(responseBody.errors);

    // Should have separate errors for each user
    assertEquals(responseBody.errors.length, 3);

    // Verify all errors have the same error code
    for (const error of responseBody.errors) {
      assertEquals(error.code, ApiErrorCode.RATE_LIMITED);
      assertEquals(error.recoverable, true);
      assertEquals(error.details.platform, Platform.TWITTER);
    }

    // Verify each error has a different userId
    const userIds = responseBody.errors.map((e) => e.details.userId);
    assertArrayIncludes(userIds, ['user-id-1', 'user-id-2', 'user-id-3']);
  });

  it('should handle recoverable vs permanent platform errors differently', async () => {
    // Create a temporary error
    const recoverableError = createPlatformError(
      ApiErrorCode.PLATFORM_ERROR,
      'Recoverable platform error',
      Platform.TWITTER,
      { userId: 'test-user-id' },
      true, // recoverable = true
    );

    // Create services with recoverable error
    const recoverableErrorServices = createPlatformErrorServices(recoverableError);

    // Create a controller with the recoverable error services
    const recoverableErrorController = new CreateController(
      recoverableErrorServices.postService,
      recoverableErrorServices.rateLimitService,
      recoverableErrorServices.activityTrackingService,
      recoverableErrorServices.authService,
    );

    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: 'Test post with recoverable error' }],
      },
    });

    // Call the controller
    const response = await recoverableErrorController.handle(context);
    const responseBody = await response.json();

    assertEquals(response.status, 400);
    assertEquals(responseBody.success, false);

    // Verify the response indicates a recoverable error
    assertExists(responseBody.errors);
    assertEquals(responseBody.errors.length, 1);
    assertEquals(responseBody.errors[0].code, ApiErrorCode.PLATFORM_ERROR);

    // The key assertion - make sure the recoverable flag is preserved
    assertEquals(responseBody.errors[0].recoverable, true);
  });

  it('should validate content length and reject if too long', async () => {
    // Create a mock context with content that's too long
    const longContent = 'a'.repeat(1000); // Assuming Twitter has a limit less than 1000 chars
    const context = createMockContext({
      signerId: 'test.near',
      validatedBody: {
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: longContent }],
      },
    });

    // Create a validation error with the correct error code
    const validationError = createPlatformError(
      ApiErrorCode.VALIDATION_ERROR,
      'Content exceeds maximum length',
      Platform.TWITTER,
      { userId: 'test-user-id' },
    );

    // Create services with validation error
    const validationErrorServices = createPlatformErrorServices(validationError);

    // Create a controller with validation error services
    const validationErrorController = new CreateController(
      validationErrorServices.postService,
      validationErrorServices.rateLimitService,
      validationErrorServices.activityTrackingService,
      validationErrorServices.authService,
    );

    // Call the controller
    const response = await validationErrorController.handle(context);
    const responseBody = await response.json();

    // Verify the response indicates a validation error
    assertEquals(responseBody.success, false);
    assertExists(responseBody.errors);
    assertEquals(responseBody.errors.length, 1);

    // The key assertion - make sure the error code is VALIDATION_ERROR
    assertEquals(responseBody.errors[0].code, ApiErrorCode.VALIDATION_ERROR);
    assertEquals(responseBody.errors[0].details.platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].details.userId, 'test-user-id');
  });

  it('should retry post creation on initial auth error and succeed', async () => {
    let createPostCallCount = 0;
    const mockUserId = 'retry-user-id';
    const mockSignerId = 'retry.near';

    const mockSuccessfulPostResult: PostResult = {
      id: `mock-post-id-${mockUserId}-success`,
      text: 'Test post after retry',
      createdAt: new Date().toISOString(),
      success: true,
    };

    const customPostServiceMock = {
      createPost: async (
        platform: Platform,
        userId: string,
        _content: PostContent | PostContent[],
      ): Promise<PostResult> => {
        createPostCallCount++;
        if (createPostCallCount === 1) {
          console.log('Test: Simulating 1st createPost call - throwing UNAUTHORIZED');
          throw new PlatformError(
            'Simulated token error',
            ApiErrorCode.UNAUTHORIZED,
            platform,
            { userId },
            true, // Recoverable
          );
        }
        console.log('Test: Simulating 2nd createPost call - succeeding');
        return mockSuccessfulPostResult;
      },
    };

    const servicesWithRetryMocks = createMockServices({
      postService: customPostServiceMock,
    });

    // Reset spy for unlinkAccount
    servicesWithRetryMocks.authService._spies.unlinkAccount.reset();

    const controllerWithRetry = new CreateController(
      servicesWithRetryMocks.postService,
      servicesWithRetryMocks.rateLimitService,
      servicesWithRetryMocks.activityTrackingService,
      servicesWithRetryMocks.authService,
    );

    const context = createMockContext({
      signerId: mockSignerId,
      validatedBody: {
        targets: [{ platform: Platform.TWITTER, userId: mockUserId }],
        content: [{ text: 'Test post for retry' }],
      },
    });

    const response = await controllerWithRetry.handle(context);
    const responseBody = await response.json();

    // Verify the overall response is successful
    assertEquals(response.status, 200, `Response body: ${JSON.stringify(responseBody)}`);
    assertExists(responseBody.data, 'Response data should exist');
    assertExists(responseBody.data.results, 'Results should exist in data');
    assertEquals(responseBody.data.results.length, 1, 'Should have one successful result');
    assertEquals(responseBody.data.errors.length, 0, 'Should have no errors');

    // Verify the successful result details
    const resultDetail = responseBody.data.results[0];
    assertEquals(resultDetail.platform, Platform.TWITTER);
    assertEquals(resultDetail.userId, mockUserId);
    assertEquals(resultDetail.details.id, mockSuccessfulPostResult.id);
    assertEquals(resultDetail.details.text, mockSuccessfulPostResult.text);

    // Verify createPost was called twice
    assertEquals(createPostCallCount, 2, 'postService.createPost should have been called twice');

    // Verify unlinkAccount was NOT called
    assertEquals(
      servicesWithRetryMocks.authService._spies.unlinkAccount.called,
      0,
      'authService.unlinkAccount should NOT have been called',
    );
  });
});
