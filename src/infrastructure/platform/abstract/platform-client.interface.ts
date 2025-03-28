/**
 * Platform Client Interface
 * Defines the common interface for platform-specific client implementations
 */
export interface PlatformClient {
  /**
   * Initialize the client with necessary credentials
   */
  initialize(): Promise<void>;
  
  /**
   * Get a client instance for a specific user
   * @param userId The user ID to get a client for
   */
  getClientForUser(userId: string): Promise<any>;
  
  /**
   * Get the authorization URL for the OAuth flow
   * @param redirectUri The redirect URI for the OAuth callback
   * @param state The state parameter for CSRF protection
   * @param scopes The requested OAuth scopes
   */
  getAuthUrl(redirectUri: string, state: string, scopes: string[]): string;
  
  /**
   * Exchange an authorization code for access and refresh tokens
   * @param code The authorization code from the OAuth callback
   * @param redirectUri The redirect URI used in the initial request
   * @param codeVerifier The PKCE code verifier (if applicable)
   */
  exchangeCodeForToken(code: string, redirectUri: string, codeVerifier?: string): Promise<any>;
  
  /**
   * Refresh an access token using a refresh token
   * @param refreshToken The refresh token to use
   */
  refreshToken(refreshToken: string): Promise<any>;
  
  /**
   * Revoke a user's tokens
   * @param userId The user ID whose tokens should be revoked
   */
  revokeToken(userId: string): Promise<boolean>;
}
