import {
  ApiErrorCode,
  Platform,
  PlatformName,
  TimePeriod,
  ActivityLeaderboardQuerySchema,
  AccountActivityQuerySchema,
  AccountPostsQuerySchema
} from '@crosspost/types';
import { assertEquals, assertExists } from 'jsr:@std/assert';
import { beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { ActivityController } from '../../../src/controllers/activity.controller.ts';
import type { Hono as HonoType } from '../../../src/deps.ts'; // Import Hono type for explicit typing
import { createApiError } from '../../../src/errors/api-error.ts';
import { createPlatformError } from '../../../src/errors/platform-error.ts';
import { ValidationMiddleware } from '../../../src/middleware/validation.middleware.ts';
import { MockActivityTrackingService } from '../../mocks/activity-tracking-service-mock.ts';
import { setupTestApp } from '../../utils/test-utils.ts';

// Define the type for the app instance based on setupTestApp's return type
// This requires knowing the structure of AppVariables from test-utils.ts
// Assuming AppVariables includes { requestId: string, startTime: number, signerId?: string, ... }
type TestAppEnv = {
  Variables: {
    requestId: string;
    startTime: number;
    signerId?: string;
    platform?: PlatformName;
    userId?: string;
    validatedBody?: unknown;
    validatedQuery?: Record<string, string>;
    validatedParams?: Record<string, string>;
    responseMeta?: Partial<import('@crosspost/types').ResponseMeta>;
  };
};

describe('Activity Controller', () => {
  let app: HonoType<TestAppEnv>; // Use the explicitly defined type
  let mockActivityTrackingService: MockActivityTrackingService;

  beforeEach(() => {
    mockActivityTrackingService = new MockActivityTrackingService();
    const controller = new ActivityController(mockActivityTrackingService);
    app = setupTestApp((hono) => {
      hono.get('/leaderboard', ValidationMiddleware.validateQuery(ActivityLeaderboardQuerySchema), (c) => controller.getLeaderboard(c));
      hono.get('/activity', ValidationMiddleware.validateQuery(AccountActivityQuerySchema), (c) => controller.getAccountActivity(c));
      hono.get('/posts', ValidationMiddleware.validateQuery(AccountPostsQuerySchema), (c) => controller.getAccountPosts(c));
    });
  });

  // Test cases for getLeaderboard
  it('should get global leaderboard successfully', async () => {
    // Setup mock service response
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
        },
      ]);

    // Make request
    const req = new Request('https://example.com/leaderboard');
    const response = await app.fetch(req);
    const responseBody = await response.json();

    // Verify
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertExists(responseBody.data.entries);
    assertEquals(responseBody.data.entries.length, 2);
    assertEquals(responseBody.data.entries[0].signerId, 'test.near');
    assertEquals(responseBody.data.entries[0].totalPosts, 10);
    assertExists(responseBody.meta.pagination);
    assertEquals(responseBody.meta.pagination.total, 2);
  });

  it('should handle different time periods', async () => {
    // Make request
    const req = new Request(
      'https://example.com/leaderboard?timeframe=week&limit=10&offset=0',
    );
    const response = await app.fetch(req);
    const responseBody = await response.json();

    // Verify
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertEquals(responseBody.data.timeframe, TimePeriod.WEEKLY);
  });

  it('should handle pagination correctly', async () => {
    // Make request
    const req = new Request('https://example.com/leaderboard?limit=10&offset=0');
    const response = await app.fetch(req);
    const responseBody = await response.json();

    // Verify
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertExists(responseBody.meta.pagination);
    assertEquals(responseBody.meta.pagination.limit, 10);
    assertEquals(responseBody.meta.pagination.offset, 0);
  });

  // Test cases for getAccountActivity
  it('should get account activity successfully', async () => {
    // Setup mock service response
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

    // Make request (signerId is set by the mock middleware in setupTestApp)
    const req = new Request('https://example.com/activity');
    const response = await app.fetch(req);
    const responseBody = await response.json();

    // Verify
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertEquals(responseBody.data.signerId, 'test.near');
    assertEquals(responseBody.data.postCount, 10);
  });

  it('should handle not found account activity', async () => {
    // Setup mock service response
    mockActivityTrackingService.getAccountActivity = () => {
      return Promise.resolve(null);
    };

    const req = new Request('https://example.com/activity');
    const response = await app.fetch(req);
    const responseBody = await response.json();

    // Verify
    assertEquals(response.status, 404);
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].code, 'NOT_FOUND');
  });

  // Test cases for getAccountPosts
  it('should get account posts successfully', async () => {
    // Make request (signerId is set by the mock middleware in setupTestApp)
    const req = new Request('https://example.com/posts');
    const response = await app.fetch(req);
    const responseBody = await response.json();

    // Verify
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertExists(responseBody.data.posts);
    assertEquals(responseBody.data.posts.length, 2);
    assertEquals(responseBody.data.posts[0].id, 'post1');
    assertEquals(responseBody.data.posts[0].platform, Platform.TWITTER);
  });

  it('should handle internal errors gracefully', async () => {
    // Setup mock service to throw error
    mockActivityTrackingService.getLeaderboard = () => {
      throw createApiError(
        ApiErrorCode.INTERNAL_ERROR,
        'Test error',
      );
    };

    // Make request
    const req = new Request('https://example.com/leaderboard');
    const response = await app.fetch(req);

    // Verify
    assertEquals(response.status, 500);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].code, 'INTERNAL_ERROR');
    assertEquals(responseBody.errors[0].message, 'Test error');
  });

  it('should handle rate limit errors', async () => {
    // Setup mock service to throw error
    mockActivityTrackingService.getLeaderboard = () => {
      throw createPlatformError(
        ApiErrorCode.RATE_LIMITED,
        'Rate limit exceeded',
        Platform.TWITTER,
        { userId: 'twitter-user-1', retryAfter: 3600 },
        true, // Recoverable
      );
    };

    // Make request
    const req = new Request('https://example.com/leaderboard');
    const response = await app.fetch(req);

    // Verify
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
    // Setup mock service to throw error
    mockActivityTrackingService.getAccountActivity = () => {
      throw createPlatformError(
        ApiErrorCode.UNAUTHORIZED,
        'Authentication failed',
        Platform.TWITTER,
        { userId: 'twitter-user-1' },
      );
    };

    // Make request (signerId is set by the mock middleware in setupTestApp)
    const req = new Request('https://example.com/activity');
    const response = await app.fetch(req);

    // Verify
    assertEquals(response.status, 401);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].code, 'UNAUTHORIZED');
    assertEquals(responseBody.errors[0].details.platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].details.userId, 'twitter-user-1');
  });

  it('should handle platform-specific errors', async () => {
    // Setup mock service to throw error
    mockActivityTrackingService.getAccountPosts = () => {
      throw createPlatformError(
        ApiErrorCode.PLATFORM_ERROR,
        'Platform API error',
        Platform.TWITTER,
        { userId: 'twitter-user-1' },
      );
    };

    // Make request (signerId is set by the mock middleware in setupTestApp)
    const req = new Request('https://example.com/posts');
    const response = await app.fetch(req);

    // Verify
    assertEquals(response.status, 502);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].code, 'PLATFORM_ERROR');
    assertEquals(responseBody.errors[0].details.platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].details.userId, 'twitter-user-1');
  });
});
