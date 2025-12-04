import {
  type ActivityLeaderboardResponse,
  ApiErrorCode,
  type CreatePostRequest,
  type ErrorDetail,
  Platform,
  type PlatformName,
  type SuccessDetail,
  TimePeriod,
} from '@crosspost/types';
import type { Context } from '../../../deps.ts';
import { CreateController } from '../../../src/controllers/post/create.controller.ts';
import { createErrorDetail, createSuccessDetail } from '../../../src/utils/response.utils.ts';
import { createMockServices } from '../../utils/test-utils.ts';
import { createMockPaginatedResponse } from './test-server.ts';

/**
 * Mock controller for activity operations
 */
export class MockActivityController {
  /**
   * Handle activity leaderboard with pagination
   * @param c Hono context
   * @returns Response
   */
  static async handleGetLeaderboard(c: Context): Promise<Response> {
    // Parse pagination parameters
    const limit = parseInt(c.req.query('limit') || '10', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const total = 100; // Total number of items

    // Create mock leaderboard data
    const leaderboardData: ActivityLeaderboardResponse = {
      timeframe: TimePeriod.ALL,
      entries: Array.from({ length: Math.min(limit, total - offset) }, (_, i) => ({
        signerId: `user${i + offset}.near`,
        totalPosts: Math.floor(Math.random() * 100),
        totalLikes: Math.floor(Math.random() * 200),
        totalReposts: Math.floor(Math.random() * 50),
        totalReplies: Math.floor(Math.random() * 30),
        totalQuotes: Math.floor(Math.random() * 20),
        totalScore: Math.floor(Math.random() * 1000),
        rank: i + 1 + offset,
        lastActive: new Date().toISOString(),
        firstPostTimestamp: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      })),
      generatedAt: new Date().toISOString(),
      platforms: [Platform.TWITTER],
    };

    // Return paginated response
    return createMockPaginatedResponse(
      c,
      leaderboardData,
      limit,
      offset,
      total,
    );
  }

  /**
   * Handle account activity with pagination
   * @param c Hono context
   * @returns Response
   */
  static async handleGetAccountActivity(c: Context): Promise<Response> {
    const signerId = (c as any).params?.signerId || 'test.near';

    // Create mock account activity data
    const accountActivityData = {
      signerId,
      timeframe: 'all',
      totalPosts: Math.floor(Math.random() * 100),
      totalLikes: Math.floor(Math.random() * 200),
      totalReposts: Math.floor(Math.random() * 50),
      totalReplies: Math.floor(Math.random() * 30),
      totalQuotes: Math.floor(Math.random() * 20),
      totalScore: Math.floor(Math.random() * 1000),
      rank: Math.floor(Math.random() * 100) + 1,
      lastActive: new Date().toISOString(),
      platforms: [
        {
          platform: Platform.TWITTER,
          posts: Math.floor(Math.random() * 50),
          likes: Math.floor(Math.random() * 100),
          reposts: Math.floor(Math.random() * 25),
          replies: Math.floor(Math.random() * 15),
          quotes: Math.floor(Math.random() * 10),
          score: Math.floor(Math.random() * 500),
          lastActive: new Date().toISOString(),
        },
      ],
    };

    // Return response with data
    return c.json({
      success: true,
      data: accountActivityData,
      meta: {
        requestId: c.get('requestId'),
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Test controller that extends the real CreateController
 * Uses the actual controller logic but overrides processMultipleTargets
 * to generate specific responses based on the request content
 */
export class TestCreateController extends CreateController {
  private currentRequest?: CreatePostRequest;

  /**
   * Creates an instance of TestCreateController with mock services
   */
  constructor() {
    // Create mock services
    const services = createMockServices();
    super(
      services.postService,
      services.rateLimitService,
      services.activityTrackingService,
      services.authService,
    );
  }

  /**
   * Override processMultipleTargets to control test scenarios
   * @param signerId NEAR account ID
   * @param targets Array of operation targets
   * @param action Action type for rate limiting
   * @param processor Function to process each target
   * @returns Object with success results and error details
   */
  protected override async processMultipleTargets<
    T extends { platform: PlatformName; userId: string },
  >(
    signerId: string,
    targets: T[],
    action: string,
    processor: (target: T, index: number) => Promise<any>,
  ): Promise<{
    successResults: SuccessDetail[];
    errorDetails: ErrorDetail[];
  }> {
    const successResults: SuccessDetail[] = [];
    const errorDetails: ErrorDetail[] = [];

    // Check the first content item's text to determine test scenario
    const contentText = this.currentRequest?.content?.[0]?.text || '';

    if (contentText.includes('all_success')) {
      // Generate all success results
      for (const target of targets) {
        successResults.push(createSuccessDetail(
          target.platform,
          target.userId,
          {
            id: `post-${crypto.randomUUID()}`,
            text: contentText,
            createdAt: new Date().toISOString(),
            success: true,
          },
        ));
      }
    } else if (contentText.includes('all_error')) {
      // Extract error code if specified (e.g., "all_error:PLATFORM_ERROR")
      const errorCodeMatch = contentText.match(/all_error:([A-Z_]+)/);
      const errorCode = errorCodeMatch
        ? ApiErrorCode[errorCodeMatch[1] as keyof typeof ApiErrorCode]
        : ApiErrorCode.PLATFORM_ERROR;

      // Generate all error results
      for (const target of targets) {
        errorDetails.push(createErrorDetail(
          `Error for ${target.userId}`,
          errorCode,
          false,
          {
            platform: target.platform,
            userId: target.userId,
          },
        ));
      }
    } else if (contentText.includes('partial')) {
      // Generate partial success/error results
      const successCount = targets.length > 1 ? Math.ceil(targets.length / 2) : 0;

      // Add success results for first half
      for (let i = 0; i < successCount; i++) {
        successResults.push(createSuccessDetail(
          targets[i].platform,
          targets[i].userId,
          {
            id: `post-${crypto.randomUUID()}`,
            text: contentText,
            createdAt: new Date().toISOString(),
            success: true,
          },
        ));
      }

      // Add error results for second half
      for (let i = successCount; i < targets.length; i++) {
        errorDetails.push(createErrorDetail(
          `Error for ${targets[i].userId}`,
          ApiErrorCode.PLATFORM_ERROR,
          false,
          {
            platform: targets[i].platform,
            userId: targets[i].userId,
          },
        ));
      }
    } else if (contentText.includes('throw_error')) {
      // Extract error type if specified (e.g., "throw_error:PLATFORM_ERROR")
      const errorTypeMatch = contentText.match(/throw_error:([A-Z_]+)/);
      const errorCode = errorTypeMatch
        ? ApiErrorCode[errorTypeMatch[1] as keyof typeof ApiErrorCode]
        : ApiErrorCode.PLATFORM_ERROR;

      // Throw a specific error type
      throw new Error(`Test error with code ${errorCode}`);
    } else {
      // Default behavior - use the mock services
      return await super.processMultipleTargets(signerId, targets, action, processor);
    }

    return { successResults, errorDetails };
  }

  /**
   * Override handle to store request for use in processMultipleTargets
   * @param c The Hono context
   * @returns HTTP response
   */
  override async handle(c: Context): Promise<Response> {
    // Store request for use in processMultipleTargets
    this.currentRequest = c.get('validatedBody') as CreatePostRequest;
    return super.handle(c);
  }
}
