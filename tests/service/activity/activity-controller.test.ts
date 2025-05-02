import { ActivityType, ApiErrorCode, Platform, PlatformName, TimePeriod } from '@crosspost/types';
import { createApiError } from '../../../src/errors/api-error.ts';
import { createPlatformError } from '../../../src/errors/platform-error.ts';
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
        {
          signerId: 'test.near',
          totalPosts: 10,
          totalLikes: 0,
          totalReposts: 0,
          totalReplies: 0,
          totalQuotes: 0,
          totalScore: 10,
          rank: 1,
          lastActive: new Date(Date.now()).toISOString(),
          firstPostTimestamp: new Date(Date.now()).toISOString(),
        },
        {
          signerId: 'user2.near',
          totalPosts: 5,
          totalLikes: 0,
          totalReposts: 0,
          totalReplies: 0,
          totalQuotes: 0,
          totalScore: 5,
          rank: 2,
          lastActive: new Date(Date.now() - 86400000).toISOString(),
          firstPostTimestamp: new Date(Date.now() - 86400000).toISOString(),
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
    assertEquals(responseBody.data.entries[0].totalPosts, 10);
    assertExists(responseBody.meta.pagination);
    assertEquals(responseBody.meta.pagination.total, 2);
  });

  it('should handle platform-specific leaderboard', async () => {
    // Create a mock context with platforms query parameter
    const context = createMockContext({
      signerId: 'test.near',

      validatedQuery: {
        filter: {
          platforms: [Platform.TWITTER],
          timeframe: TimePeriod.ALL,
        },
        limit: 10,
        offset: 0,
      },
    });

    mockActivityTrackingService.getLeaderboard = () =>
      Promise.resolve([
        {
          signerId: 'test.near',
          totalPosts: 10,
          totalLikes: 0,
          totalReposts: 0,
          totalReplies: 0,
          totalQuotes: 0,
          totalScore: 10,
          rank: 1,
          lastActive: new Date(Date.now()).toISOString(),
          firstPostTimestamp: new Date(Date.now()).toISOString(),
        },
        {
          signerId: 'user3.near',
          totalPosts: 3,
          totalLikes: 0,
          totalReposts: 0,
          totalReplies: 0,
          totalQuotes: 0,
          totalScore: 3,
          rank: 2,
          lastActive: new Date(Date.now() - 43200000).toISOString(),
          firstPostTimestamp: new Date(Date.now() - 43200000).toISOString(),
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
    assertEquals(responseBody.data.entries[0].totalPosts, 10);
    assertEquals(responseBody.data.platforms[0], Platform.TWITTER);
  });

  it('should handle different time periods', async () => {
    // Create a mock context with timeframe query parameter
    const context = createMockContext({
      signerId: 'test.near',

      validatedQuery: {
        filter: {
          timeframe: TimePeriod.WEEKLY,
        },
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
        limit: 10,
        offset: 0,
      },
    });

    // Call the controller
    const response = await controller.getLeaderboard(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertExists(responseBody.meta.pagination);
    assertEquals(responseBody.meta.pagination.limit, 10);
    assertEquals(responseBody.meta.pagination.offset, 0);
  });

  // Test cases for getAccountActivity
  it('should get account activity successfully', async () => {
    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
    });

    mockActivityTrackingService.getAccountActivity = (
      signerId: string,
      filter?: { platforms?: PlatformName[] },
    ) => {
      if (signerId === 'test.near') {
        return Promise.resolve({
          signerId: 'test.near',
          timeframe: TimePeriod.ALL,
          totalPosts: 10,
          totalLikes: 0,
          totalReposts: 0,
          totalReplies: 0,
          totalQuotes: 0,
          totalScore: 10,
          rank: 0,
          lastActive: new Date(Date.now()).toISOString(),
          platforms: [
            {
              platform: Platform.TWITTER,
              posts: 8,
              likes: 0,
              reposts: 0,
              replies: 0,
              quotes: 0,
              score: 8,
              lastActive: new Date(Date.now()).toISOString(),
            },
            {
              platform: Platform.TWITTER,
              posts: 2,
              likes: 0,
              reposts: 0,
              replies: 0,
              quotes: 0,
              score: 2,
              lastActive: new Date(Date.now() - 86400000).toISOString(),
            },
          ],
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
    assertEquals(responseBody.data.totalPosts, 10);
  });

  it('should handle not found account activity', async () => {
    // Create a mock context with a non-existent signerId
    const context = createMockContext({
      signerId: 'nonexistent.near',
    });

    // Override the mock service to return null for this specific signerId
    mockActivityTrackingService.getAccountActivity = (
      signerId: string,
      filter?: { platforms?: PlatformName[] },
    ) => {
      if (signerId === 'nonexistent.near') {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        signerId: signerId,
        timeframe: TimePeriod.ALL,
        totalPosts: 10,
        totalLikes: 0,
        totalReposts: 0,
        totalReplies: 0,
        totalQuotes: 0,
        totalScore: 10,
        rank: 0,
        lastActive: new Date(Date.now()).toISOString(),
        platforms: [
          {
            platform: Platform.TWITTER,
            posts: 10,
            likes: 0,
            reposts: 0,
            replies: 0,
            quotes: 0,
            score: 10,
            lastActive: new Date(Date.now()).toISOString(),
          },
        ],
      });
    };

    // Call the controller
    const response = await controller.getAccountActivity(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 404);
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].code, 'NOT_FOUND');
  });

  it('should handle platform-specific account activity', async () => {
    // Create a mock context with platforms filter
    const context = createMockContext({
      signerId: 'test.near',
      validatedQuery: {
        filter: {
          platforms: [Platform.TWITTER],
          timeframe: TimePeriod.ALL,
        },
      },
    });

    // Set up the mock service to return the expected data
    mockActivityTrackingService.getAccountActivity = (
      signerId: string,
      filter?: { platforms?: PlatformName[] },
    ) => {
      if (signerId === 'test.near' && filter?.platforms?.[0] === Platform.TWITTER) {
        return Promise.resolve({
          signerId: 'test.near',
          timeframe: TimePeriod.ALL,
          totalPosts: 8,
          totalLikes: 0,
          totalReposts: 0,
          totalReplies: 0,
          totalQuotes: 0,
          totalScore: 8,
          rank: 0,
          lastActive: new Date(Date.now()).toISOString(),
          platforms: [
            {
              platform: Platform.TWITTER,
              posts: 8,
              likes: 0,
              reposts: 0,
              replies: 0,
              quotes: 0,
              score: 8,
              lastActive: new Date(Date.now()).toISOString(),
            },
          ],
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
    assertEquals(responseBody.data.totalPosts, 8);
    assertEquals(responseBody.data.platforms[0].platform, Platform.TWITTER);
    assertEquals(responseBody.data.platforms[0].posts, 8);
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
    assertEquals(responseBody.data.posts[0].id, 'post1');
    assertEquals(responseBody.data.posts[0].platform, Platform.TWITTER);
  });

  it('should handle platform-specific account posts', async () => {
    // Create a mock context with platforms filter
    const context = createMockContext({
      signerId: 'test.near',

      validatedQuery: {
        filter: {
          platforms: [Platform.TWITTER],
          timeframe: TimePeriod.ALL,
        },
        limit: 10,
        offset: 0,
      },
    });

    mockActivityTrackingService.getAccountPosts = () =>
      Promise.resolve([
        {
          id: 'post1',
          platform: Platform.TWITTER,
          userId: 'twitterUser1',
          type: ActivityType.POST,
          createdAt: new Date().toISOString(),
          url: 'https://twitter.com/user/status/post1',
        },
        {
          id: 'post2',
          platform: Platform.TWITTER,
          userId: 'twitterUser1',
          type: ActivityType.POST,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          url: 'https://twitter.com/user/status/post2',
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
    assertEquals(responseBody.data.posts[0].id, 'post1');
    assertEquals(responseBody.data.posts[0].platform, Platform.TWITTER);
    assertEquals(responseBody.data.platforms[0], Platform.TWITTER);
  });

  it('should handle internal errors gracefully', async () => {
    // Create a new controller with a mock service that throws an error
    const errorMockService = new MockActivityTrackingService();
    errorMockService.getLeaderboard = () => {
      throw createApiError(
        ApiErrorCode.INTERNAL_ERROR,
        'Test error',
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
    assertEquals(responseBody.errors[0].code, 'INTERNAL_ERROR');
    assertEquals(responseBody.errors[0].message, 'Test error');
  });

  it('should handle rate limit errors', async () => {
    // Create a new controller with a mock service that throws a rate limit error
    const errorMockService = new MockActivityTrackingService();
    errorMockService.getLeaderboard = () => {
      throw createPlatformError(
        ApiErrorCode.RATE_LIMITED,
        'Rate limit exceeded',
        Platform.TWITTER,
        { userId: 'twitter-user-1', retryAfter: 3600 },
        true, // Recoverable
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
    assertEquals(responseBody.errors[0].code, 'RATE_LIMITED');
    assertEquals(responseBody.errors[0].details.platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].details.userId, 'twitter-user-1');
    assertEquals(responseBody.errors[0].recoverable, true);
    assertExists(responseBody.errors[0].details);
    assertEquals(responseBody.errors[0].details.retryAfter, 3600);
  });

  it('should handle authentication errors', async () => {
    // Create a new controller with a mock service that throws an auth error
    const errorMockService = new MockActivityTrackingService();
    errorMockService.getAccountActivity = () => {
      throw createPlatformError(
        ApiErrorCode.UNAUTHORIZED,
        'Authentication failed',
        Platform.TWITTER,
        { userId: 'twitter-user-1' },
      );
    };

    const errorController = new ActivityController(errorMockService);

    // Create a mock context with platform query parameter
    const context = createMockContext({
      signerId: 'test.near',

      validatedQuery: {
        filter: {
          platforms: [Platform.TWITTER],
          timeframe: TimePeriod.ALL,
        },
      },
    });

    // Call the controller
    const response = await errorController.getAccountActivity(context);

    // Verify the response
    assertEquals(response.status, 401);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].code, 'UNAUTHORIZED');
    assertEquals(responseBody.errors[0].details.platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].details.userId, 'twitter-user-1');
  });

  it('should handle platform-specific errors', async () => {
    // Create a new controller with a mock service that throws a platform error
    const errorMockService = new MockActivityTrackingService();
    errorMockService.getAccountPosts = () => {
      throw createPlatformError(
        ApiErrorCode.PLATFORM_ERROR,
        'Platform API error',
        Platform.TWITTER,
        { userId: 'twitter-user-1' },
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
    assertEquals(response.status, 502);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].code, 'PLATFORM_ERROR');
    assertEquals(responseBody.errors[0].details.platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].details.userId, 'twitter-user-1');
  });

  it('should handle validation errors', async () => {
    // Create a new controller with a mock service that throws a validation error
    const errorMockService = new MockActivityTrackingService();
    errorMockService.getLeaderboard = () => {
      throw createPlatformError(
        ApiErrorCode.VALIDATION_ERROR,
        'Invalid parameters',
        Platform.TWITTER,
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
    assertEquals(responseBody.errors[0].code, 'VALIDATION_ERROR');
    assertEquals(responseBody.errors[0].details.platform, Platform.TWITTER);
    assertExists(responseBody.errors[0].details);
    assertEquals(responseBody.errors[0].details.field, 'timeframe');
  });
});
