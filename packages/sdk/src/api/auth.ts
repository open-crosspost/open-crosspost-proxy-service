import type {
  ApiResponse,
  AuthRevokeResponse,
  AuthStatusResponse,
  ConnectedAccountsResponse,
  NearAuthorizationResponse,
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
   * Authorizes the NEAR account associated with the provided nearAuthData with the Crosspost service.
   * @returns A promise resolving with the authorization response.
   */
  async authorizeNearAccount(): Promise<NearAuthorizationResponse> {
    return makeRequest<NearAuthorizationResponse>(
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
  async getNearAuthorizationStatus(): Promise<NearAuthorizationResponse> {
    return makeRequest<NearAuthorizationResponse>(
      'GET',
      '/auth/authorize/near/status',
      this.options,
    );
  }

  /**
   * Initiates the login process for a specific platform.
   * The service handles the OAuth flow; this method triggers it.
   * @param platform The target platform.
   * @param options Optional success and error redirect URLs.
   * @returns A promise resolving with the response from the service (might indicate success/failure or redirect info).
   */
  async loginToPlatform(
    platform: Platform,
    options?: { successUrl?: string; errorUrl?: string },
  ): Promise<ApiResponse<any>> { // TODO: Refine response type based on actual API
    return makeRequest<ApiResponse<any>>(
      'POST',
      `/auth/${platform}/login`,
      this.options,
      options || {},
    );
  }

  /**
   * Refreshes the authentication token for the specified platform.
   * @param platform The target platform.
   * @returns A promise resolving with the refresh response.
   */
  async refreshToken(platform: Platform): Promise<ApiResponse<any>> { // TODO: Refine response type
    return makeRequest<ApiResponse<any>>(
      'POST',
      `/auth/${platform}/refresh`,
      this.options,
    );
  }

  /**
   * Refreshes the user's profile information from the specified platform.
   * @param platform The target platform.
   * @returns A promise resolving with the profile refresh response.
   */
  async refreshProfile(platform: Platform): Promise<ApiResponse<any>> { // TODO: Refine response type
    return makeRequest<ApiResponse<any>>(
      'POST',
      `/auth/${platform}/refresh-profile`,
      this.options,
    );
  }

  /**
   * Gets the authentication status for the specified platform.
   * @param platform The target platform.
   * @returns A promise resolving with the authentication status response.
   */
  async getAuthStatus(platform: Platform): Promise<AuthStatusResponse> {
    return makeRequest<AuthStatusResponse>(
      'GET',
      `/auth/${platform}/status`,
      this.options,
    );
  }

  /**
   * Revokes the authentication token for the specified platform.
   * @param platform The target platform.
   * @returns A promise resolving with the revocation response.
   */
  async revokeAuth(platform: Platform): Promise<AuthRevokeResponse> {
    return makeRequest<AuthRevokeResponse>(
      'DELETE',
      `/auth/${platform}/revoke`,
      this.options,
    );
  }

  /**
   * Lists all accounts connected to the NEAR account.
   * @returns A promise resolving with the list of connected accounts.
   */
  async getConnectedAccounts(): Promise<ConnectedAccountsResponse> {
    return makeRequest<ConnectedAccountsResponse>(
      'GET',
      '/auth/accounts',
      this.options,
    );
  }
}
