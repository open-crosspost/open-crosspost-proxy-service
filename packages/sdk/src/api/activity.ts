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
 * Creates a modified query object with filter properties flattened
 * @param query The original query object
 * @returns A new query object with filter properties flattened
 */
function createFilterQuery<T>(query?: T): Record<string, unknown> {
  if (!query) return {};

  const queryObj = query as Record<string, any>;
  const result: Record<string, unknown> = {};

  // Copy non-filter properties
  Object.keys(queryObj).forEach((key) => {
    if (key !== 'filter') {
      result[key] = queryObj[key];
    }
  });

  // Extract and flatten filter properties if they exist
  if (queryObj.filter) {
    const filter = queryObj.filter;

    if (filter.platforms && Array.isArray(filter.platforms)) {
      result.platforms = filter.platforms.join(',');
    }

    if (filter.types && Array.isArray(filter.types)) {
      result.types = filter.types.join(',');
    }

    if (filter.timeframe) {
      result.timeframe = filter.timeframe;
    }
  }

  return result;
}

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
    return makeRequest<ActivityLeaderboardResponse, never, Record<string, unknown>>(
      'GET',
      '/api/activity',
      this.options,
      undefined,
      createFilterQuery(query),
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
    return makeRequest<AccountActivityResponse, never, Record<string, unknown>>(
      'GET',
      `/api/activity/${signerId}`,
      this.options,
      undefined,
      createFilterQuery(query),
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
    return makeRequest<AccountPostsResponse, never, Record<string, unknown>>(
      'GET',
      `/api/activity/${signerId}/posts`,
      this.options,
      undefined,
      createFilterQuery(query),
    );
  }
}
