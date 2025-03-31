import { PlatformError } from './platform-error.ts';
import { PlatformClient } from './platform-client.interface.ts';

/**
 * Platform Auth Interface
 * Defines the common interface for platform-specific authentication implementations
 * Responsible for managing the authentication flow and token storage
 */
export interface PlatformAuth {
  /**
   * Initialize the authentication process
   * @param signerId NEAR account ID for linking
   * @param redirectUri The redirect URI for the OAuth callback
   * @param scopes The requested OAuth scopes
   * @param successUrl The URL to redirect to on successful authentication
   * @param errorUrl The URL to redirect to on authentication failure
   * @returns The authentication URL and state
   * @throws PlatformError if the initialization fails
   */
  initializeAuth(
    signerId: string,
    redirectUri: string,
    scopes: string[],
    successUrl?: string,
    errorUrl?: string,
  ): Promise<{ authUrl: string; state: string; codeVerifier?: string }>;

  /**
   * Get the auth state data from storage
   * @param state The state parameter from the callback
   * @returns The auth state data including successUrl and errorUrl
   * @throws PlatformError if the state is invalid or expired
   */
  getAuthState(
    state: string,
  ): Promise<{ successUrl: string; errorUrl: string; signerId: string } | null>;

  /**
   * Handle the OAuth callback
   * @param code The authorization code from the OAuth callback
   * @param state The state parameter from the callback
   * @returns The user ID, tokens, and success URL
   * @throws PlatformError if the callback handling fails
   */
  handleCallback(
    code: string,
    state: string,
  ): Promise<{ userId: string; tokens: any; successUrl: string }>;

  /**
   * Refresh a user's access token
   * This method manages the entire refresh process including storage
   * @param userId The user ID whose token should be refreshed
   * @returns The new tokens
   * @throws PlatformError if the refresh fails
   */
  refreshToken(userId: string): Promise<any>;

  /**
   * Revoke a user's tokens
   * This method manages the entire revocation process including storage
   * @param userId The user ID whose tokens should be revoked
   * @returns True if the revocation was successful
   * @throws PlatformError if the revocation fails
   */
  revokeToken(userId: string): Promise<boolean>;

  /**
   * Get the platform client
   * @returns The platform client
   */
  getPlatformClient(): PlatformClient;
}
