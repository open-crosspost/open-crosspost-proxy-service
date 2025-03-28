import { DEFAULT_CONFIG } from './../../../config/index.ts';
import { PlatformAuth } from '../abstract/platform-auth.interface.ts';
import { TwitterClient } from './twitter-client.ts';
import { TokenStorage, TokenType, TwitterTokens } from '../../storage/token-storage.ts';
import { Env } from '../../../config/env.ts';

/**
 * Twitter Auth
 * Implements the PlatformAuth interface for Twitter
 */
export class TwitterAuth implements PlatformAuth {
  private env: Env;
  private twitterClient: TwitterClient;
  private tokenStorage: TokenStorage;
  
  constructor(env: Env) {
    this.env = env;
    this.twitterClient = new TwitterClient(env);
    this.tokenStorage = new TokenStorage(env.ENCRYPTION_KEY);
  }
  
  /**
   * Initialize the authentication process
   * @param redirectUri The redirect URI for the OAuth callback
   * @param scopes The requested OAuth scopes
   * @returns The authentication URL and state
   */
  async initializeAuth(
    redirectUri: string,
    scopes: string[] = DEFAULT_CONFIG.AUTH.DEFAULT_SCOPES
  ): Promise<{ authUrl: string; state: string; codeVerifier?: string }> {
    // Generate a random state for CSRF protection using Web Crypto API
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const state = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Generate the authorization URL
    const authUrl = this.twitterClient.getAuthUrl(redirectUri, state, scopes);
    
    return {
      authUrl,
      state,
      codeVerifier: state, // Use state as code verifier for simplicity
    };
  }
  
  /**
   * Handle the OAuth callback
   * @param code The authorization code from the OAuth callback
   * @param state The state parameter from the callback
   * @param savedState The state parameter saved during initialization
   * @param redirectUri The redirect URI used in the initial request
   * @param codeVerifier The PKCE code verifier
   * @returns The user ID and tokens
   */
  async handleCallback(
    code: string,
    state: string,
    savedState: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<{ userId: string; tokens: TwitterTokens }> {
    // Verify the state parameter
    if (state !== savedState) {
      throw new Error('Invalid state parameter');
    }
    
    // Exchange the code for tokens
    const tokens = await this.twitterClient.exchangeCodeForToken(code, redirectUri, codeVerifier);
    
    // Get the user ID
    const client = await this.twitterClient.getClientForUser(tokens.accessToken);
    const { data: user } = await client.v2.me();
    
    return {
      userId: user.id,
      tokens,
    };
  }
  
  /**
   * Refresh a user's access token
   * @param userId The user ID whose token should be refreshed
   * @returns The new tokens
   */
  async refreshToken(userId: string): Promise<TwitterTokens> {
    try {
      // Get the current tokens
      const tokens = await this.tokenStorage.getTokens(userId);
      
      // Check if refresh token exists
      if (!tokens.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      // Refresh the token
      const newTokens = await this.twitterClient.refreshToken(tokens.refreshToken);
      
      // Save the new tokens
      await this.tokenStorage.saveTokens(userId, {
        ...newTokens,
        tokenType: TokenType.OAUTH2,
      });
      
      return newTokens;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Failed to refresh token');
    }
  }
  
  /**
   * Revoke a user's tokens
   * @param userId The user ID whose tokens should be revoked
   * @returns True if the tokens were revoked
   */
  async revokeToken(userId: string): Promise<boolean> {
    return this.twitterClient.revokeToken(userId);
  }
}
