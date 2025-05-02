import type {
  AccountActivityQuery,
  AccountActivityResponse,
  AccountPostsQuery,
  AccountPostsResponse,
  ActivityLeaderboardQuery,
  ActivityLeaderboardResponse,
  ApiResponse,
} from '@crosspost/types';
import { makeRequest, type RequestOptions } from '../core/request.ts';

/**
 * Activity-related API operations
 */
export class ActivityApi {
  private options: RequestOptions;

  /**
   * Creates an instance of ActivityApi
   * @param options Request options
   */
  constructor(options: RequestOptions) {
    this.options = options;
  }

  /**
   * Gets the global activity leaderboard
   * @param query Optional query parameters
   * @returns A promise resolving with the leaderboard response
   */
  async getLeaderboard(
    query?: ActivityLeaderboardQuery,
  ): Promise<ApiResponse<ActivityLeaderboardResponse>> {
    return makeRequest<ActivityLeaderboardResponse, never, ActivityLeaderboardQuery>(
      'GET',
      '/api/activity',
      this.options,
      undefined,
      query,
    );
  }

  /**
   * Gets activity for a specific account
   * @param signerId The NEAR account ID
   * @param query Optional query parameters
   * @returns A promise resolving with the account activity response
   */
  async getAccountActivity(
    signerId: string,
    query?: AccountActivityQuery,
  ): Promise<ApiResponse<AccountActivityResponse>> {
    return makeRequest<AccountActivityResponse, never, AccountActivityQuery>(
      'GET',
      `/api/activity/${signerId}`,
      this.options,
      undefined,
      query,
    );
  }

  /**
   * Gets posts for a specific account
   * @param signerId The NEAR account ID
   * @param query Optional query parameters
   * @returns A promise resolving with the account posts response
   */
  async getAccountPosts(
    signerId: string,
    query?: AccountPostsQuery,
  ): Promise<ApiResponse<AccountPostsResponse>> {
    return makeRequest<AccountPostsResponse, never, AccountPostsQuery>(
      'GET',
      `/api/activity/${signerId}/posts`,
      this.options,
      undefined,
      query,
    );
  }
}
