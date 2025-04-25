import { ApiErrorCode, CreatePostRequestSchema, Platform, PostContent } from '@crosspost/types';
import { assertArrayIncludes, assertEquals, assertExists } from 'jsr:@std/assert';
import { beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { CreateController } from '../../../src/controllers/post/create.controller.ts';
import type { Hono as HonoType } from '../../../src/deps.ts';
import { createPlatformError } from '../../../src/errors/platform-error.ts';
import { ValidationMiddleware } from '../../../src/middleware/validation.middleware.ts';
import {
  createAuthErrorServices,
  createMockServices,
  createRateLimitErrorServices,
  setupTestApp,
  type TestAppEnv,
} from '../../utils/test-utils.ts';

describe('Post Creation Controller', () => {
  let app: HonoType<TestAppEnv>;
  let services: ReturnType<typeof createMockServices>;
  let controller: CreateController;

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

    // Setup test app with routes
    app = setupTestApp((hono) => {
      hono.post('/post', ValidationMiddleware.validateBody(CreatePostRequestSchema), (c) => controller.handle(c));
    });
  });

  it('should create a post successfully', async () => {
    // Create request with the necessary body
    const req = new Request('https://example.com/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: 'Test post from API' }],
      }),
    });

    // Make the request
    const response = await app.fetch(req);
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

    // Setup a new test app with the rate-limited controller
    const rateLimitApp = setupTestApp((hono) => {
      hono.post('/post', ValidationMiddleware.validateBody(CreatePostRequestSchema), (c) => rateLimitController.handle(c));
    });

    // Create request
    const req = new Request('https://example.com/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: 'Test post that will hit rate limit' }],
      }),
    });

    // Make the request
    const response = await rateLimitApp.fetch(req);
    const responseBody = await response.json();

    // Verify the response indicates a rate limit error
    assertEquals(response.status, 429);
    assertEquals(responseBody.data.results.length, 0);
    assertExists(responseBody.data.errors);
    assertEquals(responseBody.data.errors.length, 1);
    assertEquals(responseBody.data.errors[0].code, ApiErrorCode.RATE_LIMITED);
    assertEquals(responseBody.data.errors[0].details.platform, Platform.TWITTER);
    assertEquals(responseBody.data.errors[0].details.userId, 'test-user-id');
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

    // Setup a new test app with the auth error controller
    const authErrorApp = setupTestApp((hono) => {
      hono.post('/post', ValidationMiddleware.validateBody(CreatePostRequestSchema), (c) => authErrorController.handle(c));
    });

    // Create request
    const req = new Request('https://example.com/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: 'Test post with auth error' }],
      }),
    });

    // Make the request
    const response = await authErrorApp.fetch(req);

    const responseBody = await response.json();

    // Verify the response indicates an authentication error
    assertEquals(response.status, 401);
    assertEquals(responseBody.data.results.length, 0);
    assertExists(responseBody.data.errors);
    assertEquals(responseBody.data.errors.length, 1);
    assertEquals(responseBody.data.errors[0].code, ApiErrorCode.UNAUTHORIZED);
    assertEquals(responseBody.data.errors[0].details.platform, Platform.TWITTER);
    assertEquals(responseBody.data.errors[0].details.userId, 'test-user-id');
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
    const platformErrorServices = {
      ...services,
      postService: {
        createPost: () => Promise.reject(platformError),
      } as any,
    };

    // Create a controller with the platform error services
    const platformErrorController = new CreateController(
      platformErrorServices.postService,
      platformErrorServices.rateLimitService,
      platformErrorServices.activityTrackingService,
      platformErrorServices.authService,
    );

    // Setup a new test app with the platform error controller
    const platformErrorApp = setupTestApp((hono) => {
      hono.post('/post', ValidationMiddleware.validateBody(CreatePostRequestSchema), (c) => platformErrorController.handle(c));
    });

    // Create request
    const req = new Request('https://example.com/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: 'Test post causing platform error' }],
      }),
    });

    // Make the request
    const response = await platformErrorApp.fetch(req);
    const responseBody = await response.json();

    // Verify the response indicates a platform error
    assertEquals(response.status, 502);
    assertEquals(responseBody.data.results.length, 0);
    assertExists(responseBody.data.errors);
    assertEquals(responseBody.data.errors.length, 1);
    assertEquals(responseBody.data.errors[0].code, ApiErrorCode.PLATFORM_ERROR);
    assertEquals(responseBody.data.errors[0].message, 'Platform specific error');
    assertEquals(responseBody.data.errors[0].details.platform, Platform.TWITTER);
    assertEquals(responseBody.data.errors[0].details.userId, 'test-user-id');
  });

  it('should handle multiple platform targets', async () => {
    // Create request with multiple targets
    const req = new Request('https://example.com/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    });

    // Make the request
    const response = await app.fetch(req);
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
    // Create request with media attachments
    const req = new Request('https://example.com/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: 'Test post with media' }],
        mediaIds: ['media-1', 'media-2'],
      }),
    });

    // Make the request
    const response = await app.fetch(req);
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
    const mediaErrorServices = {
      ...services,
      postService: {
        createPost: () => Promise.reject(mediaError),
      } as any,
    };

    // Create a controller with the media error services
    const mediaErrorController = new CreateController(
      mediaErrorServices.postService,
      mediaErrorServices.rateLimitService,
      mediaErrorServices.activityTrackingService,
      mediaErrorServices.authService,
    );

    // Setup a new test app with the media error controller
    const mediaErrorApp = setupTestApp((hono) => {
      hono.post('/post', ValidationMiddleware.validateBody(CreatePostRequestSchema), (c) => mediaErrorController.handle(c));
    });

    // Create request with media attachments
    const req = new Request('https://example.com/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: 'Test post with media that will fail' }],
        mediaIds: ['media-1'],
      }),
    });

    // Make the request
    const response = await mediaErrorApp.fetch(req);
    const responseBody = await response.json();

    // Verify the response indicates a media error
    assertEquals(response.status, 502);
    assertEquals(responseBody.data.results.length, 0);
    assertExists(responseBody.data.errors);
    assertEquals(responseBody.data.errors.length, 1);
    assertEquals(responseBody.data.errors[0].code, ApiErrorCode.PLATFORM_ERROR);
    assertEquals(responseBody.data.errors[0].details.platform, Platform.TWITTER);
    assertEquals(responseBody.data.errors[0].details.userId, 'test-user-id');
    assertEquals(responseBody.data.errors[0].details.twitterErrorCode, 324);
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

    // Setup a new test app with the mixed result controller
    const mixedResultApp = setupTestApp((hono) => {
      hono.post('/post', ValidationMiddleware.validateBody(CreatePostRequestSchema), (c) => mixedResultController.handle(c));
    });

    // Create request with multiple targets
    const req = new Request('https://example.com/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    });

    // Make the request
    const response = await mixedResultApp.fetch(req);
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

    // Setup a new test app with the error controller
    const errorApp = setupTestApp((hono) => {
      hono.post('/post', ValidationMiddleware.validateBody(CreatePostRequestSchema), (c) => errorController.handle(c));
    });

    // Create request with multiple targets
    const req = new Request('https://example.com/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    });

    // Make the request
    const response = await errorApp.fetch(req);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 429); // Rate limited
    assertExists(responseBody.data);
    assertExists(responseBody.data.errors);

    // Should have separate errors for each user
    assertEquals(responseBody.data.results.length, 0);
    assertEquals(responseBody.data.errors.length, 3);

    // Verify all errors have the same error code
    for (const error of responseBody.data.errors) {
      assertEquals(error.code, ApiErrorCode.RATE_LIMITED);
      assertEquals(error.recoverable, true);
      assertEquals(error.details.platform, Platform.TWITTER);
    }

    // Verify the summary counts are correct
    assertEquals(responseBody.data.summary.total, 3);
    assertEquals(responseBody.data.summary.succeeded, 0);
    assertEquals(responseBody.data.summary.failed, 3);

    // Verify each error has a different userId
    const userIds = responseBody.data.errors.map((e) => e.details.userId);
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
    const recoverableErrorServices = {
      ...services,
      postService: {
        createPost: () => Promise.reject(recoverableError),
      } as any,
    };

    // Create a controller with the recoverable error services
    const recoverableErrorController = new CreateController(
      recoverableErrorServices.postService,
      recoverableErrorServices.rateLimitService,
      recoverableErrorServices.activityTrackingService,
      recoverableErrorServices.authService,
    );

    // Setup a new test app with the recoverable error controller
    const recoverableErrorApp = setupTestApp((hono) => {
      hono.post('/post', ValidationMiddleware.validateBody(CreatePostRequestSchema), (c) => recoverableErrorController.handle(c));
    });

    // Create request
    const req = new Request('https://example.com/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: 'Test post with recoverable error' }],
      }),
    });

    // Make the request
    const response = await recoverableErrorApp.fetch(req);
    const responseBody = await response.json();

    assertEquals(response.status, 502);

    // Verify the response indicates a recoverable error
    assertExists(responseBody.data);
    assertExists(responseBody.data.errors);
    assertEquals(responseBody.data.results.length, 0);
    assertEquals(responseBody.data.errors.length, 1);
    assertEquals(responseBody.data.errors[0].code, ApiErrorCode.PLATFORM_ERROR);

    // The key assertion - make sure the recoverable flag is preserved
    assertEquals(responseBody.data.errors[0].recoverable, true);
  });

  it('should validate content length and reject if too long', async () => {
    // Create a validation error with the correct error code
    const validationError = createPlatformError(
      ApiErrorCode.VALIDATION_ERROR,
      'Content exceeds maximum length',
      Platform.TWITTER,
      { userId: 'test-user-id' },
    );

    // Create services with validation error
    const validationErrorServices = {
      ...services,
      postService: {
        createPost: () => Promise.reject(validationError),
      } as any,
    };

    // Create a controller with validation error services
    const validationErrorController = new CreateController(
      validationErrorServices.postService,
      validationErrorServices.rateLimitService,
      validationErrorServices.activityTrackingService,
      validationErrorServices.authService,
    );

    // Setup a new test app with the validation error controller
    const validationErrorApp = setupTestApp((hono) => {
      hono.post('/post', ValidationMiddleware.validateBody(CreatePostRequestSchema), (c) => validationErrorController.handle(c));
    });

    // Create request with long content
    const longContent = 'a'.repeat(1000); // Assuming Twitter has a limit less than 1000 chars
    const req = new Request('https://example.com/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targets: [
          {
            platform: Platform.TWITTER,
            userId: 'test-user-id',
          },
        ],
        content: [{ text: longContent }],
      }),
    });

    // Make the request
    const response = await validationErrorApp.fetch(req);
    const responseBody = await response.json();

    // Verify the response indicates a validation error
    assertExists(responseBody.data);
    assertExists(responseBody.data.errors);
    assertEquals(responseBody.data.results.length, 0);
    assertEquals(responseBody.data.errors.length, 1);

    // The key assertion - make sure the error code is VALIDATION_ERROR
    assertEquals(responseBody.data.errors[0].code, ApiErrorCode.VALIDATION_ERROR);
    assertEquals(responseBody.data.errors[0].details.platform, Platform.TWITTER);
    assertEquals(responseBody.data.errors[0].details.userId, 'test-user-id');
  });
});
