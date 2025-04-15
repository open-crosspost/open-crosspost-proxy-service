import {
  ApiErrorCode,
  createEnhancedErrorResponse,
  createErrorDetail,
  PlatformName,
  TimePeriod,
} from '@crosspost/types';
import { Context } from '../../deps.ts';
import { ActivityTrackingService } from '../domain/services/activity-tracking.service.ts';
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
      // Parse query parameters
      const validatedQuery = c.get('validatedQuery') || {};
      const limit = parseInt(validatedQuery.limit || '10');
      const offset = parseInt(validatedQuery.offset || '0');
      const timePeriodParam = validatedQuery.timeframe || TimePeriod.ALL;
      const platform = validatedQuery.platform as PlatformName | undefined;

      // Validate time period
      let timePeriod: TimePeriod;
      if (Object.values(TimePeriod).includes(timePeriodParam as TimePeriod)) {
        timePeriod = timePeriodParam as TimePeriod;
      } else {
        timePeriod = TimePeriod.ALL;
      }

      // Get leaderboard data
      let leaderboard;
      let total;

      if (platform) {
        // Get platform-specific leaderboard
        leaderboard = await this.activityTrackingService.getPlatformLeaderboard(
          platform,
          limit,
          offset,
          timePeriod,
        );
        total = await this.activityTrackingService.getTotalPlatformAccounts(platform, timePeriod);
      } else {
        // Get global leaderboard
        leaderboard = await this.activityTrackingService.getLeaderboard(limit, offset, timePeriod);
        total = await this.activityTrackingService.getTotalAccounts(timePeriod);
      }

      // Return the result
      return c.json({
        data: {
          entries: leaderboard,
          pagination: {
            total,
            limit,
            offset,
          },
          timeframe: timePeriod,
          platform,
        },
      });
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
      // Extract NEAR account ID from the validated signature
      const signerId = c.get('signerId') as string;

      const validatedQuery = c.get('validatedQuery') || {};
      const platform = validatedQuery.platform as PlatformName | undefined;

      let activity;
      if (platform) {
        // Get platform-specific account activity
        activity = await this.activityTrackingService.getPlatformAccountActivity(
          signerId,
          platform,
        );
      } else {
        // Get global account activity
        activity = await this.activityTrackingService.getAccountActivity(signerId);
      }

      if (!activity) {
        c.status(404);
        return c.json(createEnhancedErrorResponse([createErrorDetail(
          'Account activity not found',
          ApiErrorCode.NOT_FOUND,
          false,
          platform,
          signerId,
        )]));
      }

      // Return the result
      return c.json({
        data: activity,
      });
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
      const signerId = c.get('signerId') as string;

      const validatedQuery = c.get('validatedQuery') || {};
      const platform = validatedQuery.platform as PlatformName | undefined;
      const limit = parseInt(validatedQuery.limit || '10');
      const offset = parseInt(validatedQuery.offset || '0');

      let posts;
      if (platform) {
        // Get platform-specific account posts
        posts = await this.activityTrackingService.getAccountPlatformPosts(
          signerId,
          platform,
          limit,
          offset,
        );
      } else {
        // Get all account posts
        posts = await this.activityTrackingService.getAccountPosts(signerId, limit, offset);
      }

      // Return the result
      return c.json({
        data: {
          signerId,
          posts,
          pagination: {
            limit,
            offset,
          },
          platform,
        },
      });
    } catch (error) {
      return this.handleError(error, c);
    }
  }
}
