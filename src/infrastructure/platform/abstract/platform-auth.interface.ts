/**
 * Platform Auth Interface
 * Defines the common interface for platform-specific authentication implementations
 */
export interface PlatformAuth {
  /**
   * Initialize the authentication process
   * @param redirectUri The redirect URI for the OAuth callback
   * @param scopes The requested OAuth scopes
   */
  initializeAuth(redirectUri: string, scopes: string[], clientReturnUrl?: string): Promise<{ authUrl: string; state: string; codeVerifier?: string }>;
  
  /**
   * Handle the OAuth callback
   * @param code The authorization code from the OAuth callback
   * @param state The state parameter from the callback
   * @param savedState The state parameter saved during initialization
   * @param redirectUri The redirect URI used in the initial request
   * @param codeVerifier The PKCE code verifier (if applicable)
   */
  handleCallback(
    code: string,
    state: string,
    savedState: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<{ userId: string; tokens: any; clientReturnUrl?: string }>;
  
  /**
   * Refresh a user's access token
   * @param userId The user ID whose token should be refreshed
   */
  refreshToken(userId: string): Promise<any>;
  
  /**
   * Revoke a user's tokens
   * @param userId The user ID whose tokens should be revoked
   */
  revokeToken(userId: string): Promise<boolean>;
}
