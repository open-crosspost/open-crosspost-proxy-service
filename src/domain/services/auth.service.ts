import { PlatformAuth } from '../../infrastructure/platform/abstract/platform-auth.interface.ts';
import { TwitterAuth } from '../../infrastructure/platform/twitter/twitter-auth.ts';
import { Env } from '../../config/env.ts';
import { createApiResponse, createErrorResponse } from '../../types/response.types.ts';
import { DEFAULT_CONFIG } from '../../config/index.ts';
import { TokenStorage, TwitterTokens } from '../../infrastructure/storage/token-storage.ts';
import { linkAccountToNear } from '../../utils/account-linking.utils.ts';

/**
 * Auth Service
 * Domain service for authentication-related operations
 */
export class AuthService {
  private platformAuthMap: Map<string, PlatformAuth>;
  private tokenStorage: TokenStorage;
  private env: Env;
  
  constructor(env: Env) {
    this.env = env;
    this.tokenStorage = new TokenStorage(env.ENCRYPTION_KEY, env);
    
    // Initialize supported platforms
    this.platformAuthMap = new Map();
    this.platformAuthMap.set('twitter', new TwitterAuth(env));
    // Add more platforms as they're implemented
    // this.platformAuthMap.set('linkedin', new LinkedInAuth(env));
  }
  
  /**
   * Get the platform-specific auth implementation
   * @param platform The platform name (e.g., 'twitter')
   * @returns The platform-specific auth implementation
   * @throws Error if the platform is not supported
   */
  private getPlatformAuth(platform: string): PlatformAuth {
    const platformAuth = this.platformAuthMap.get(platform.toLowerCase());
    if (!platformAuth) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return platformAuth;
  }
  
  /**
   * Initialize the authentication process
   * @param platform The platform name (e.g., 'twitter')
   * @param signerId NEAR account ID for linking
   * @param redirectUri The redirect URI for the OAuth callback
   * @param scopes The requested OAuth scopes
   * @param successUrl The URL to redirect to on successful authentication
   * @param errorUrl The URL to redirect to on authentication failure
   * @returns The authentication URL and state
   */
  async initializeAuth(
    platform: string,
    signerId: string,
    redirectUri: string,
    scopes: string[] = DEFAULT_CONFIG.AUTH.DEFAULT_SCOPES,
    successUrl?: string,
    errorUrl?: string
  ): Promise<{ authUrl: string; state: string; codeVerifier?: string }> {
    try {
      const platformAuth = this.getPlatformAuth(platform);
      return await platformAuth.initializeAuth(signerId, redirectUri, scopes, successUrl, errorUrl);
    } catch (error) {
      console.error('Error initializing auth:', error);
      throw error;
    }
  }
  
  /**
   * Get the auth state data from storage
   * @param platform The platform name (e.g., 'twitter')
   * @param state The state parameter from the callback
   * @returns The auth state data including successUrl and errorUrl
   */
  async getAuthState(platform: string, state: string): Promise<{ successUrl: string; errorUrl: string; signerId: string } | null> {
    try {
      const platformAuth = this.getPlatformAuth(platform);
      return await platformAuth.getAuthState(state);
    } catch (error) {
      console.error('Error getting auth state:', error);
      return null;
    }
  }

  /**
   * Handle the OAuth callback
   * @param platform The platform name (e.g., 'twitter')
   * @param code The authorization code from the OAuth callback
   * @param state The state parameter from the callback
   * @returns The user ID and tokens
   */
  async handleCallback(
    platform: string,
    code: string,
    state: string,
  ): Promise<{ userId: string; tokens: TwitterTokens; successUrl: string }> {
    try {
      const platformAuth = this.getPlatformAuth(platform);
      return await platformAuth.handleCallback(code, state);
    } catch (error) {
      console.error('Error handling callback:', error);
      throw error;
    }
  }
  
  /**
   * Refresh a user's access token
   * @param platform The platform name (e.g., 'twitter')
   * @param userId The user ID whose token should be refreshed
   * @returns The new tokens
   */
  async refreshToken(platform: string, userId: string): Promise<TwitterTokens> {
    try {
      const platformAuth = this.getPlatformAuth(platform);
      return await platformAuth.refreshToken(userId);
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }
  
  /**
   * Revoke a user's tokens
   * @param platform The platform name (e.g., 'twitter')
   * @param userId The user ID whose tokens should be revoked
   * @returns True if the tokens were revoked
   */
  async revokeToken(platform: string, userId: string): Promise<boolean> {
    try {
      const platformAuth = this.getPlatformAuth(platform);
      return await platformAuth.revokeToken(userId);
    } catch (error) {
      console.error('Error revoking token:', error);
      throw error;
    }
  }
  
  /**
   * Check if a user has valid tokens
   * @param platform The platform name (e.g., 'twitter')
   * @param userId The user ID to check
   * @returns True if the user has valid tokens
   */
  async hasValidTokens(platform: string, userId: string): Promise<boolean> {
    try {
      return await this.tokenStorage.hasTokens(userId);
    } catch (error) {
      console.error('Error checking tokens:', error);
      return false;
    }
  }
  
  /**
   * Link a social media account to a NEAR wallet
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., 'twitter')
   * @param userId User ID on the platform
   * @returns Success status
   */
  async linkAccount(
    signerId: string,
    platform: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Get the tokens for the user
      const platformAuth = this.getPlatformAuth(platform);
      const tokens = await platformAuth.refreshToken(userId);
      
      // Link the account using the utility function
      await linkAccountToNear(signerId, platform, userId, tokens, this.env);
      
      return true;
    } catch (error) {
      console.error(`Error linking ${platform} account to NEAR wallet:`, error);
      throw new Error(`Failed to link ${platform} account to NEAR wallet`);
    }
  }
  
  /**
   * Create a standard API response
   * @param data The response data
   * @returns A standard API response
   */
  createResponse(data: any): Response {
    return new Response(JSON.stringify(createApiResponse(data)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  /**
   * Create an error response
   * @param error The error object
   * @param status The response status
   * @returns An error response
   */
  createErrorResponse(error: any, status = 500): Response {
    const errorMessage = error.message || 'An unexpected error occurred';
    const errorType = error.type || 'INTERNAL_ERROR';
    
    return new Response(JSON.stringify(createErrorResponse(errorType, errorMessage, error.code, error.details)), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
