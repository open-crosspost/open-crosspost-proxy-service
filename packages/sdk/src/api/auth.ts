import type {
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
   * Authorizes the NEAR account associated with the provided nearAuthData with the Crosspost service.
   * @returns A promise resolving with the authorization response.
   */
  async authorizeNearAccount(): Promise<NearAuthorizationResponse> {
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
  async getNearAuthorizationStatus(): Promise<NearAuthorizationResponse> {
    return makeRequest<NearAuthorizationResponse, never>(
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
    options?: AuthInitRequest,
  ): Promise<AuthUrlResponse> {
    return makeRequest<AuthUrlResponse, AuthInitRequest>(
      'POST',
      `/auth/${platform}/login`,
      this.options,
      options || {},
    );
  }

  /**
   * Refreshes the authentication token for the specified platform.
   * @param platform The target platform.
   * @returns A promise resolving with the refresh response containing updated auth details.
   */
  async refreshToken(platform: Platform, userId: string): Promise<AuthCallbackResponse> {
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
  async refreshProfile(platform: Platform, userId: string): Promise<ConnectedAccount> {
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
  async getAuthStatus(platform: Platform, userId: string): Promise<AuthStatusResponse> {
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
  async unauthorizeNear(): Promise<NearUnauthorizationResponse> {
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
  async revokeAuth(platform: Platform, userId: string): Promise<AuthRevokeResponse> {
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
  async getConnectedAccounts(): Promise<ConnectedAccountsResponse> {
    return makeRequest<ConnectedAccountsResponse, never>(
      'GET',
      '/auth/accounts',
      this.options,
    );
  }
}
