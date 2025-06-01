import {
  type AccountActivityEntry,
  AccountActivityQuery,
  AccountActivityResponse,
  AccountPost,
  AccountPostsParams,
  AccountPostsQuery,
  AccountPostsResponse,
  ActivityLeaderboardQuery,
  ActivityLeaderboardResponse,
  ApiErrorCode,
  TimePeriod,
} from '@crosspost/types';
import { Context } from '../../deps.ts';
import { ActivityTrackingService } from '../domain/services/activity-tracking.service.ts';
import { createApiError } from '../errors/api-error.ts';
import { createSuccessResponse } from '../utils/response.utils.ts';
import { BaseController } from './base.controller.ts';

/**
 * Activity Controller
 * Handles HTTP requests for activity-related operations including leaderboards and user activity
 */
export class ActivityController extends BaseController {
  private activityTrackingService: ActivityTrackingService;

  /**
   * Creates an instance of ActivityController with dependency injection
   * @param activityTrackingService The activity tracking service
   */
  constructor(activityTrackingService: ActivityTrackingService) {
    super();
    this.activityTrackingService = activityTrackingService;
  }

  /**
   * Get leaderboard
   * @param c The Hono context
   * @returns HTTP response
   */
  async getLeaderboard(c: Context): Promise<Response> {
    try {
      const { limit, offset, timeframe, platforms, types, startDate, endDate } =
        c.get('validatedQuery') as ActivityLeaderboardQuery || {};

      const filter = {
        timeframe,
        platforms,
        types,
        startDate,
        endDate
      };

      const leaderboard: AccountActivityEntry[] = await this.activityTrackingService.getLeaderboard(
        limit,
        offset,
        filter,
      );

      const total: number = await this.activityTrackingService.getTotalAccounts(filter);

      // Return the result
      return c.json(createSuccessResponse<ActivityLeaderboardResponse>(
        c,
        {
          timeframe: timeframe || TimePeriod.ALL,
          entries: leaderboard,
          generatedAt: new Date().toISOString(),
          platforms: platforms,
        },
        {
          pagination: {
            total,
            limit,
            offset,
          },
        },
      ));
    } catch (error) {
      return this.handleError(error, c);
    }
  }

  /**
   * Get account activity
   * @param c The Hono context
   * @returns HTTP response
   */
  async getAccountActivity(c: Context): Promise<Response> {
    try {
      const signerId = c.get('signerId') as string;

      const { timeframe, platforms, types, startDate, endDate } = c.get('validatedQuery') as AccountActivityQuery || {};

      const filter = {
        timeframe,
        platforms,
        types,
        startDate,
        endDate
      };

      const activity = await this.activityTrackingService.getAccountActivity(signerId, filter);

      if (!activity) {
        throw createApiError(ApiErrorCode.NOT_FOUND, 'Account activity not found');
      }

      // Return the result
      return c.json(createSuccessResponse<AccountActivityResponse>(c, activity));
    } catch (error) {
      return this.handleError(error, c);
    }
  }

  /**
   * Get account posts
   * @param c The Hono context
   * @returns HTTP response
   */
  async getAccountPosts(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      // const signerId = c.get('signerId') as string;

      const { signerId } = c.get('validatedParams') as AccountPostsParams || {};
      const { limit, offset, timeframe, platforms, types, startDate, endDate } =
        c.get('validatedQuery') as AccountPostsQuery || {};

      const filter = {
        timeframe,
        platforms,
        types,
        startDate,
        endDate
      };

      // Get posts with pagination
      const posts: AccountPost[] = await this.activityTrackingService.getAccountPosts(
        signerId,
        limit,
        offset,
        filter,
      );

      const totalPosts = await this.activityTrackingService.getTotalPostCount(signerId, filter);

      return c.json(createSuccessResponse<AccountPostsResponse>(
        c,
        {
          signerId,
          posts,
          platforms: platforms,
          types: types,
        },
        {
          pagination: {
            total: totalPosts,
            limit,
            offset,
          },
        },
      ));
    } catch (error) {
      return this.handleError(error, c);
    }
  }
}
