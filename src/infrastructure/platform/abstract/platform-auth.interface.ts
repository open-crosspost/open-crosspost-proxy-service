/**
 * Platform Auth Interface
 * Defines the common interface for platform-specific authentication implementations
 */
export interface PlatformAuth {
  /**
   * Initialize the authentication process
   * @param redirectUri The redirect URI for the OAuth callback
   * @param scopes The requested OAuth scopes
   * @param successUrl The URL to redirect to on successful authentication
   * @param errorUrl The URL to redirect to on authentication failure
   */
  initializeAuth(
    redirectUri: string, 
    scopes: string[], 
    successUrl?: string, 
    errorUrl?: string
  ): Promise<{ authUrl: string; state: string; codeVerifier?: string }>;
  
  /**
   * Get the auth state data from storage
   * @param state The state parameter from the callback
   * @returns The auth state data including successUrl and errorUrl
   */
  getAuthState(state: string): Promise<{ successUrl: string; errorUrl: string } | null>;
  
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
  ): Promise<{ userId: string; tokens: any; successUrl: string }>;
  
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
