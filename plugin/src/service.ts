import { Effect } from 'every-plugin/effect';
import type * as Types from '@crosspost/types';
import { createAuthHeaders, isValidNearAuthData } from './utils/auth-helpers';
import { getStatusErrorMessage, mapToCrosspostError } from './errors/error-mapping';
import type { NearAuthData } from './types/auth';

/**
 * CrosspostService - HTTP client for Crosspost API with NEAR authentication
 */
export class CrosspostService {
  constructor(
    private readonly baseUrl: string,
    private readonly nearAuthData: NearAuthData,
    private readonly timeout: number,
  ) {
    if (!isValidNearAuthData(nearAuthData)) {
      throw new Error('Invalid NEAR authentication data');
    }
  }

  // ============ AUTH METHODS ============

  authorizeNearAccount() {
    return this.makeRequest<Types.NearAuthorizationResponse>(
      'POST',
      '/auth/authorize/near',
      {},
    );
  }

  getNearAuthorizationStatus() {
    return this.makeRequest<Types.NearAuthorizationResponse>(
      'GET',
      '/auth/authorize/near/status',
    );
  }

  loginToPlatform(platform: Types.Platform, options?: Types.AuthInitRequest) {
    return this.makeRequest<Types.AuthUrlResponse | Types.AuthCallbackResponse>(
      'POST',
      `/auth/${platform}/login`,
      options || { redirect: false },
    );
  }

  refreshToken(platform: Types.Platform, userId: string) {
    return this.makeRequest<Types.AuthCallbackResponse>(
      'POST',
      `/auth/${platform}/refresh`,
      { userId },
    );
  }

  refreshProfile(platform: Types.Platform, userId: string) {
    return this.makeRequest<Types.ConnectedAccount>(
      'POST',
      `/auth/${platform}/refresh-profile`,
      { userId },
    );
  }

  getAuthStatus(platform: Types.Platform, userId: string) {
    return this.makeRequest<Types.AuthStatusResponse>(
      'GET',
      `/auth/${platform}/status/${userId}`,
    );
  }

  unauthorizeNear() {
    return this.makeRequest<Types.NearUnauthorizationResponse>(
      'DELETE',
      '/auth/unauthorize/near',
      {},
    );
  }

  revokeAuth(platform: Types.Platform, userId: string) {
    return this.makeRequest<Types.AuthRevokeResponse>(
      'DELETE',
      `/auth/${platform}/revoke`,
      { userId },
    );
  }

  getConnectedAccounts() {
    return this.makeRequest<Types.ConnectedAccountsResponse>(
      'GET',
      '/auth/accounts',
    );
  }

  // ============ POST METHODS ============

  createPost(request: Types.CreatePostRequest) {
    return this.makeRequest<Types.MultiStatusData>(
      'POST',
      '/api/post',
      request,
    );
  }

  deletePost(request: Types.DeletePostRequest) {
    return this.makeRequest<Types.MultiStatusData>(
      'DELETE',
      '/api/post',
      request,
    );
  }

  repost(request: Types.RepostRequest) {
    return this.makeRequest<Types.MultiStatusData>(
      'POST',
      '/api/post/repost',
      request,
    );
  }

  quotePost(request: Types.QuotePostRequest) {
    return this.makeRequest<Types.MultiStatusData>(
      'POST',
      '/api/post/quote',
      request,
    );
  }

  replyToPost(request: Types.ReplyToPostRequest) {
    return this.makeRequest<Types.MultiStatusData>(
      'POST',
      '/api/post/reply',
      request,
    );
  }

  likePost(request: Types.LikePostRequest) {
    return this.makeRequest<Types.MultiStatusData>(
      'POST',
      '/api/post/like',
      request,
    );
  }

  unlikePost(request: Types.UnlikePostRequest) {
    return this.makeRequest<Types.MultiStatusData>(
      'DELETE',
      '/api/post/like',
      request,
    );
  }

  // ============ ACTIVITY METHODS ============

  getLeaderboard(query?: Types.ActivityLeaderboardQuery) {
    return this.makeRequest<Types.ActivityLeaderboardResponse>(
      'GET',
      '/api/activity',
      undefined,
      query,
    );
  }

  getAccountActivity(signerId: string, query?: Types.AccountActivityQuery) {
    return this.makeRequest<Types.AccountActivityResponse>(
      'GET',
      `/api/activity/${signerId}`,
      undefined,
      query,
    );
  }

  getAccountPosts(signerId: string, query?: Types.AccountPostsQuery) {
    return this.makeRequest<Types.AccountPostsResponse>(
      'GET',
      `/api/activity/${signerId}/posts`,
      undefined,
      query,
    );
  }

  // ============ SYSTEM METHODS ============

  getRateLimits() {
    return this.makeRequest<Types.RateLimitResponse>(
      'GET',
      '/api/rate-limit',
    );
  }

  getEndpointRateLimit(endpoint: string) {
    return this.makeRequest<Types.EndpointRateLimitResponse>(
      'GET',
      `/api/rate-limit/${endpoint}`,
    );
  }

  getHealthStatus() {
    return this.makeRequest<Types.HealthStatus>(
      'GET',
      '/health',
    );
  }

  // ============ PRIVATE HELPERS ============

  private makeRequest<T>(
    method: string,
    path: string,
    data?: unknown,
    query?: Record<string, unknown>,
  ) {
    return Effect.tryPromise({
      try: async () => {
        const url = new URL(path, this.baseUrl);

        // Add query parameters
        if (query) {
          Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              url.searchParams.append(key, String(value));
            }
          });
        }

        const headers = createAuthHeaders(method, this.nearAuthData);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const response = await fetch(url, {
            method,
            headers,
            body: method !== 'GET' && data ? JSON.stringify(data) : undefined,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const responseData = await response.json();

          if (!response.ok) {
            throw mapToCrosspostError(responseData, response.status);
          }

          return (responseData.data || responseData) as T;
        } finally {
          clearTimeout(timeoutId);
        }
      },
      catch: (error: unknown) => {
        if (error instanceof Error) {
          return error;
        }
        return new Error(String(error));
      },
    });
  }
}
