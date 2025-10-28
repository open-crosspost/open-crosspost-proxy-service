import type {
  ApiResponse,
  AuthCallbackResponse,
  AuthInitRequest,
  AuthRevokeResponse,
  AuthStatusParams,
  AuthStatusResponse,
  AuthTokenRequest,
  AuthUrlResponse,
  ConnectedAccount,
  ConnectedAccountsResponse,
  NearAuthorizationRequest,
  NearAuthorizationResponse,
  NearUnauthorizationResponse,
  Platform,
} from '@crosspost/types';
import { makeRequest, type RequestOptions } from '../core/request.ts';

/**
 * Authentication-related API operations
 */
export class AuthApi {
  private options: RequestOptions;

  /**
   * Creates an instance of AuthApi
   * @param options Request options
   */
  constructor(options: RequestOptions) {
    this.options = options;
  }

  /**
   * Authorizes the NEAR account associated with the provided authToken with the Crosspost service.
   * @returns A promise resolving with the authorization response.
   */
  async authorizeNearAccount(): Promise<ApiResponse<NearAuthorizationResponse>> {
    return makeRequest<NearAuthorizationResponse, NearAuthorizationRequest>(
      'POST',
      '/auth/authorize/near',
      this.options,
      {},
    );
  }

  /**
   * Checks the authorization status of the NEAR account with the Crosspost service.
   * @returns A promise resolving with the authorization status response.
   */
  async getNearAuthorizationStatus(): Promise<ApiResponse<NearAuthorizationResponse>> {
    return makeRequest<NearAuthorizationResponse, never>(
      'GET',
      '/auth/authorize/near/status',
      this.options,
    );
  }

  /**
   * Initiates the login process for a specific platform using OAuth redirect flow.
   * @param platform The target platform.
   * @param options Optional configuration including success and error redirect URLs.
   * @returns Promise that resolves with the authentication URL response.
   * @example
   * ```typescript
   * const response = await client.auth.loginToPlatform('twitter', {
   *   redirect: true,
   *   successRedirect: 'https://myapp.com/auth/success',
   *   errorRedirect: 'https://myapp.com/auth/error'
   * });
   * // Redirect user to response.data.url
   * window.location.href = response.data.url;
   * ```
   */
  async loginToPlatform(
    platform: Platform,
    options?: AuthInitRequest,
  ): Promise<ApiResponse<AuthUrlResponse>> {
    // Use provided options or default to redirect: true (redirect-only flow)
    const requestOptions = options || { redirect: true };

    // Make POST request to get auth URL
    const response = await makeRequest<AuthUrlResponse, AuthInitRequest>(
      'POST',
      `/auth/${platform}/login`,
      this.options,
      requestOptions,
    );

    return response;
  }

  /**
   * Refreshes the authentication token for the specified platform.
   * @param platform The target platform.
   * @returns A promise resolving with the refresh response containing updated auth details.
   */
  async refreshToken(
    platform: Platform,
    userId: string,
  ): Promise<ApiResponse<AuthCallbackResponse>> {
    return makeRequest<AuthCallbackResponse, AuthTokenRequest>(
      'POST',
      `/auth/${platform}/refresh`,
      this.options,
      { userId },
    );
  }

  /**
   * Refreshes the user's profile information from the specified platform.
   * @param platform The target platform.
   * @param userId The user ID on the platform
   * @returns A promise resolving with the updated account profile information.
   */
  async refreshProfile(platform: Platform, userId: string): Promise<ApiResponse<ConnectedAccount>> {
    return makeRequest<ConnectedAccount, AuthTokenRequest>(
      'POST',
      `/auth/${platform}/refresh-profile`,
      this.options,
      { userId },
    );
  }

  /**
   * Gets the authentication status for the specified platform.
   * @param platform The target platform.
   * @returns A promise resolving with the authentication status response.
   */
  async getAuthStatus(
    platform: Platform,
    userId: string,
  ): Promise<ApiResponse<AuthStatusResponse>> {
    return makeRequest<AuthStatusResponse, never, AuthStatusParams>(
      'GET',
      `/auth/${platform}/status/${userId}`,
      this.options,
      undefined,
      { platform, userId },
    );
  }

  /**
   * Unauthorizes a NEAR account from using the service
   * @returns A promise resolving with the unauthorized response
   */
  async unauthorizeNear(): Promise<ApiResponse<NearUnauthorizationResponse>> {
    return makeRequest<NearUnauthorizationResponse, NearAuthorizationRequest>(
      'DELETE',
      '/auth/unauthorize/near',
      this.options,
      {},
    );
  }

  /**
   * Revokes the authentication token for the specified platform.
   * @param platform The target platform.
   * @returns A promise resolving with the revocation response.
   */
  async revokeAuth(platform: Platform, userId: string): Promise<ApiResponse<AuthRevokeResponse>> {
    return makeRequest<AuthRevokeResponse, AuthTokenRequest>(
      'DELETE',
      `/auth/${platform}/revoke`,
      this.options,
      { userId },
    );
  }

  /**
   * Lists all accounts connected to the NEAR account.
   * @returns A promise resolving with the connected accounts response containing an array of accounts.
   * @throws {CrosspostError} If the request fails or returns invalid data.
   */
  async getConnectedAccounts(): Promise<ApiResponse<ConnectedAccountsResponse>> {
    return makeRequest<ConnectedAccountsResponse, never>(
      'GET',
      '/auth/accounts',
      this.options,
    );
  }
}
