import { PlatformAuth } from '../../infrastructure/platform/abstract/platform-auth.interface.ts';
import { TwitterAuth } from '../../infrastructure/platform/twitter/twitter-auth.ts';
import { Env } from '../../config/env.ts';
import { createApiResponse, createErrorResponse } from '../../types/response.types.ts';
import { DEFAULT_CONFIG } from '../../config/index.ts';
import { TokenStorage, TwitterTokens } from '../../infrastructure/storage/token-storage.ts';

/**
 * Auth Service
 * Domain service for authentication-related operations
 */
export class AuthService {
  private platformAuth: PlatformAuth;
  private tokenStorage: TokenStorage;
  constructor(env: Env) {
    // For now, we only support Twitter
    this.platformAuth = new TwitterAuth(env);
    this.tokenStorage = new TokenStorage(env.ENCRYPTION_KEY);
  }
  
  /**
   * Initialize the authentication process
   * @param redirectUri The redirect URI for the OAuth callback
   * @param scopes The requested OAuth scopes
   * @param successUrl The URL to redirect to on successful authentication
   * @param errorUrl The URL to redirect to on authentication failure
   * @returns The authentication URL and state
   */
  async initializeAuth(
    redirectUri: string,
    scopes: string[] = DEFAULT_CONFIG.AUTH.DEFAULT_SCOPES,
    successUrl?: string,
    errorUrl?: string
  ): Promise<{ authUrl: string; state: string; codeVerifier?: string }> {
    try {
      return await this.platformAuth.initializeAuth(redirectUri, scopes, successUrl, errorUrl);
    } catch (error) {
      console.error('Error initializing auth:', error);
      throw error;
    }
  }
  
  /**
   * Get the auth state data from storage
   * @param state The state parameter from the callback
   * @returns The auth state data including successUrl and errorUrl
   */
  async getAuthState(state: string): Promise<{ successUrl: string; errorUrl: string } | null> {
    try {
      return await this.platformAuth.getAuthState(state);
    } catch (error) {
      console.error('Error getting auth state:', error);
      return null;
    }
  }

  /**
   * Handle the OAuth callback
   * @param code The authorization code from the OAuth callback
   * @param state The state parameter from the callback
   * @returns The user ID and tokens
   */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ userId: string; tokens: TwitterTokens; successUrl: string }> {
    try {
      return await this.platformAuth.handleCallback(code, state);
    } catch (error) {
      console.error('Error handling callback:', error);
      throw error;
    }
  }
  
  /**
   * Refresh a user's access token
   * @param userId The user ID whose token should be refreshed
   * @returns The new tokens
   */
  async refreshToken(userId: string): Promise<TwitterTokens> {
    try {
      return await this.platformAuth.refreshToken(userId);
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }
  
  /**
   * Revoke a user's tokens
   * @param userId The user ID whose tokens should be revoked
   * @returns True if the tokens were revoked
   */
  async revokeToken(userId: string): Promise<boolean> {
    try {
      return await this.platformAuth.revokeToken(userId);
    } catch (error) {
      console.error('Error revoking token:', error);
      throw error;
    }
  }
  
  /**
   * Check if a user has valid tokens
   * @param userId The user ID to check
   * @returns True if the user has valid tokens
   */
  async hasValidTokens(userId: string): Promise<boolean> {
    try {
      return await this.tokenStorage.hasTokens(userId);
    } catch (error) {
      console.error('Error checking tokens:', error);
      return false;
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
