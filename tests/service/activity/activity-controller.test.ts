import {
  ApiError,
  ApiErrorCode,
  Platform,
  PlatformError,
  PlatformName,
  TimePeriod,
} from '@crosspost/types';
import { assertEquals, assertExists } from 'jsr:@std/assert';
import { beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { ActivityController } from '../../../src/controllers/activity.controller.ts';
import { MockActivityTrackingService } from '../../mocks/activity-tracking-service-mock.ts';
import { createMockContext } from '../../utils/test-utils.ts';

describe('Activity Controller', () => {
  let controller: ActivityController;
  let mockActivityTrackingService: MockActivityTrackingService;

  beforeEach(() => {
    mockActivityTrackingService = new MockActivityTrackingService();

    // Create the controller and override its activityTrackingService
    controller = new ActivityController(mockActivityTrackingService);
  });

  // Test cases for getLeaderboard
  it('should get global leaderboard successfully', async () => {
    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
    });

    mockActivityTrackingService.getLeaderboard = () =>
      Promise.resolve([
        { signerId: 'test.near', postCount: 10, lastPostTimestamp: Date.now() },
        { signerId: 'user2.near', postCount: 5, lastPostTimestamp: Date.now() - 86400000 },
      ]);

    // Call the controller
    const response = await controller.getLeaderboard(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertExists(responseBody.data.entries);
    assertEquals(responseBody.data.entries.length, 2);
    assertEquals(responseBody.data.entries[0].signerId, 'test.near');
    assertEquals(responseBody.data.entries[0].postCount, 10);
    assertEquals(responseBody.data.pagination.total, 2);
  });

  it('should handle platform-specific leaderboard', async () => {
    // Create a mock context with platform query parameter
    const context = createMockContext({
      signerId: 'test.near',

      validatedQuery: {
        platform: Platform.TWITTER,
        limit: '10',
        offset: '0',
      },
    });

    mockActivityTrackingService.getPlatformLeaderboard = () =>
      Promise.resolve([
        {
          signerId: 'test.near',
          postCount: 10,
          lastPostTimestamp: Date.now(),
          platform: Platform.TWITTER,
        },
        {
          signerId: 'user3.near',
          postCount: 3,
          lastPostTimestamp: Date.now() - 43200000,
          platform: Platform.TWITTER,
        },
      ]);

    // Call the controller
    const response = await controller.getLeaderboard(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertExists(responseBody.data.entries);
    assertEquals(responseBody.data.entries.length, 2);
    assertEquals(responseBody.data.entries[0].signerId, 'test.near');
    assertEquals(responseBody.data.entries[0].postCount, 10);
    assertEquals(responseBody.data.entries[0].platform, Platform.TWITTER);
    assertEquals(responseBody.data.platform, Platform.TWITTER);
  });

  it('should handle different time periods', async () => {
    // Create a mock context with timeframe query parameter
    const context = createMockContext({
      signerId: 'test.near',

      validatedQuery: {
        timeframe: TimePeriod.WEEKLY,
        limit: '10',
        offset: '0',
      },
    });

    // Call the controller
    const response = await controller.getLeaderboard(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertEquals(responseBody.data.timeframe, TimePeriod.WEEKLY);
  });

  it('should handle pagination correctly', async () => {
    // Create a mock context with pagination parameters
    const context = createMockContext({
      signerId: 'test.near',

      validatedQuery: {
        limit: '10',
        offset: '0',
      },
    });

    // Call the controller
    const response = await controller.getLeaderboard(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertExists(responseBody.data.pagination);
    assertEquals(responseBody.data.pagination.limit, 10);
    assertEquals(responseBody.data.pagination.offset, 0);
  });

  // Test cases for getAccountActivity
  it('should get account activity successfully', async () => {
    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
    });

    mockActivityTrackingService.getAccountActivity = (signerId: string) => {
      if (signerId === 'test.near') {
        return Promise.resolve({
          signerId: 'test.near',
          postCount: 10,
          firstPostTimestamp: Date.now() - 604800000,
          lastPostTimestamp: Date.now(),
        });
      }
      return Promise.resolve(null);
    };

    // Call the controller
    const response = await controller.getAccountActivity(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertEquals(responseBody.data.signerId, 'test.near');
    assertEquals(responseBody.data.postCount, 10);
  });

  it('should handle not found account activity', async () => {
    // Create a mock context with a non-existent signerId
    const context = createMockContext({
      signerId: 'nonexistent.near',
    });

    // Override the mock service to return null for this specific signerId
    mockActivityTrackingService.getAccountActivity = (signerId: string) => {
      if (signerId === 'nonexistent.near') {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        signerId: signerId,
        postCount: 10,
        firstPostTimestamp: Date.now() - 604800000,
        lastPostTimestamp: Date.now(),
      });
    };

    // Call the controller
    const response = await controller.getAccountActivity(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 404);
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].errorCode, 'NOT_FOUND');
  });

  it('should handle platform-specific account activity', async () => {
    // Create a mock context with platform query parameter
    const context = createMockContext({
      signerId: 'test.near',
      validatedQuery: {
        platform: Platform.TWITTER,
      },
    });

    // Set up the mock service to return the expected data
    mockActivityTrackingService.getPlatformAccountActivity = (
      signerId: string,
      platform: PlatformName,
    ) => {
      if (signerId === 'test.near' && platform === Platform.TWITTER) {
        return Promise.resolve({
          signerId: 'test.near',
          platform: Platform.TWITTER,
          postCount: 8,
          firstPostTimestamp: Date.now() - 604800000,
          lastPostTimestamp: Date.now(),
        });
      }
      return Promise.resolve(null);
    };

    // Call the controller
    const response = await controller.getAccountActivity(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertEquals(responseBody.data.signerId, 'test.near');
    assertEquals(responseBody.data.platform, Platform.TWITTER);
    assertEquals(responseBody.data.postCount, 8);
  });

  // Test cases for getAccountPosts
  it('should get account posts successfully', async () => {
    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
    });

    // Call the controller
    const response = await controller.getAccountPosts(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertExists(responseBody.data.posts);
    assertEquals(responseBody.data.posts.length, 2);
    assertEquals(responseBody.data.posts[0].postId, 'post1');
    assertEquals(responseBody.data.posts[0].platform, Platform.TWITTER);
  });

  it('should handle platform-specific account posts', async () => {
    // Create a mock context with platform query parameter
    const context = createMockContext({
      signerId: 'test.near',

      validatedQuery: {
        platform: Platform.TWITTER,
        limit: '10',
        offset: '0',
      },
    });

    mockActivityTrackingService.getAccountPlatformPosts = () =>
      Promise.resolve([
        {
          postId: 'post1',
          platform: Platform.TWITTER,
          timestamp: new Date().toISOString(),
          userId: 'twitter-user-1',
        },
        {
          postId: 'post2',
          platform: Platform.TWITTER,
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          userId: 'twitter-user-1',
        },
      ]);

    // Call the controller
    const response = await controller.getAccountPosts(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertExists(responseBody.data.posts);
    assertEquals(responseBody.data.posts.length, 2);
    assertEquals(responseBody.data.posts[0].postId, 'post1');
    assertEquals(responseBody.data.posts[0].platform, Platform.TWITTER);
    assertEquals(responseBody.data.platform, Platform.TWITTER);
  });

  it('should handle internal errors gracefully', async () => {
    // Create a new controller with a mock service that throws an error
    const errorMockService = new MockActivityTrackingService();
    errorMockService.getLeaderboard = () => {
      throw new ApiError(
        'Test error',
        ApiErrorCode.INTERNAL_ERROR,
        500,
        {},
        false,
      );
    };

    const errorController = new ActivityController(errorMockService);

    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
    });

    // Call the controller
    const response = await errorController.getLeaderboard(context);

    // Verify the response
    assertEquals(response.status, 500);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].errorCode, 'INTERNAL_ERROR');
    assertEquals(responseBody.errors[0].error, 'Test error');
  });

  it('should handle rate limit errors', async () => {
    // Create a new controller with a mock service that throws a rate limit error
    const errorMockService = new MockActivityTrackingService();
    errorMockService.getLeaderboard = () => {
      throw new PlatformError(
        'Rate limit exceeded',
        Platform.TWITTER,
        ApiErrorCode.RATE_LIMITED,
        true, // Recoverable
        undefined,
        429,
        'twitter-user-1',
        { retryAfter: 3600 }, // 1 hour
      );
    };

    const errorController = new ActivityController(errorMockService);

    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
    });

    // Call the controller
    const response = await errorController.getLeaderboard(context);

    // Verify the response
    assertEquals(response.status, 429);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].errorCode, 'RATE_LIMITED');
    assertEquals(responseBody.errors[0].platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].userId, 'twitter-user-1');
    assertEquals(responseBody.errors[0].recoverable, true);
    assertExists(responseBody.errors[0].details);
    assertEquals(responseBody.errors[0].details.retryAfter, 3600);
  });

  it('should handle authentication errors', async () => {
    // Create a new controller with a mock service that throws an auth error
    const errorMockService = new MockActivityTrackingService();
    errorMockService.getPlatformAccountActivity = () => {
      throw new PlatformError(
        'Authentication failed',
        Platform.TWITTER,
        ApiErrorCode.UNAUTHORIZED,
        false,
        null,
        401,
        'twitter-user-1',
      );
    };

    const errorController = new ActivityController(errorMockService);

    // Create a mock context with platform query parameter
    const context = createMockContext({
      signerId: 'test.near',

      validatedQuery: {
        platform: Platform.TWITTER,
      },
    });

    // Call the controller
    const response = await errorController.getAccountActivity(context);

    // Verify the response
    assertEquals(response.status, 401);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].errorCode, 'UNAUTHORIZED');
    assertEquals(responseBody.errors[0].platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].userId, 'twitter-user-1');
  });

  it('should handle platform-specific errors', async () => {
    // Create a new controller with a mock service that throws a platform error
    const errorMockService = new MockActivityTrackingService();
    errorMockService.getAccountPosts = () => {
      throw new PlatformError(
        'Platform API error',
        Platform.TWITTER,
        ApiErrorCode.PLATFORM_ERROR,
        false,
        null,
        500,
        'twitter-user-1',
      );
    };

    const errorController = new ActivityController(errorMockService);

    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
    });

    // Call the controller
    const response = await errorController.getAccountPosts(context);

    // Verify the response
    assertEquals(response.status, 500);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].errorCode, 'PLATFORM_ERROR');
    assertEquals(responseBody.errors[0].platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].userId, 'twitter-user-1');
  });

  it('should handle validation errors', async () => {
    // Create a new controller with a mock service that throws a validation error
    const errorMockService = new MockActivityTrackingService();
    errorMockService.getPlatformLeaderboard = () => {
      throw new PlatformError(
        'Invalid parameters',
        Platform.TWITTER,
        ApiErrorCode.VALIDATION_ERROR,
        false,
        null,
        400,
        undefined,
        { field: 'timeframe', message: 'Invalid time period' },
      );
    };

    const errorController = new ActivityController(errorMockService);

    // Create a mock context with platform query parameter
    const context = createMockContext({
      signerId: 'test.near',
      validatedQuery: {
        platform: Platform.TWITTER,
        timeframe: 'invalid-timeframe',
      },
    });

    // Call the controller
    const response = await errorController.getLeaderboard(context);

    // Verify the response
    assertEquals(response.status, 400);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].errorCode, 'VALIDATION_ERROR');
    assertEquals(responseBody.errors[0].platform, Platform.TWITTER);
    assertExists(responseBody.errors[0].details);
    assertEquals(responseBody.errors[0].details.field, 'timeframe');
  });
});
