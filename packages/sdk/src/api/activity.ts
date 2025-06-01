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
 * Creates a modified query object with filter properties
 * @param query The original query object
 * @returns A new query object with filter properties formatted as filter[key]=value.
 */
function createFilterQuery<
  T extends { filter?: Record<string, any>; limit?: number; offset?: number },
>(
  query?: T,
): Record<string, string | number | boolean> {
  if (!query) return {};

  const result: Record<string, string | number | boolean> = {};

  if (query.limit !== undefined) {
    result.limit = query.limit;
  }
  if (query.offset !== undefined) {
    result.offset = query.offset;
  }

  // e.g., query.filter = { timeframe: 'month', platforms: ['twitter'] }
  // becomes result['filter[timeframe]'] = 'month', result['filter[platforms]'] = 'twitter'
  if (query.filter) {
    const filterParams = query.filter;
    for (const filterKey in filterParams) {
      if (
        Object.prototype.hasOwnProperty.call(filterParams, filterKey) &&
        filterParams[filterKey] !== undefined
      ) {
        const value = filterParams[filterKey];
        if (Array.isArray(value)) {
          result[`filter[${filterKey}]`] = value.join(',');
        } else {
          result[`filter[${filterKey}]`] = String(value);
        }
      }
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
