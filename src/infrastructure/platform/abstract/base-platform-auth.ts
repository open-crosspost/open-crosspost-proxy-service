import { ApiErrorCode, PlatformName } from '@crosspost/types';
import { Env } from '../../../config/env.ts';
import { createPlatformError, PlatformError } from '../../../errors/platform-error.ts';
import { PrefixedKvStore } from '../../../utils/kv-store.utils.ts';
import { NearAuthService } from '../../security/near-auth-service.ts';
import { AuthToken } from '../../storage/auth-token-storage.ts';
import { AuthState, PlatformAuth } from './platform-auth.interface.ts';
import { PlatformClient } from './platform-client.interface.ts';

/**
 * Base Platform Auth
 * Base implementation of the PlatformAuth interface with common functionality
 */
export abstract class BasePlatformAuth implements PlatformAuth {
  /**
   * Create a new base platform auth
   * @param env Environment configuration
   * @param platform Platform name (e.g., 'twitter')
   * @param nearAuthService Token manager for handling tokens
   * @param kvStore KV store for auth state
   */
  constructor(
    protected env: Env,
    protected platform: PlatformName,
    protected nearAuthService: NearAuthService,
    protected kvStore: PrefixedKvStore,
  ) {}

  /**
   * Handle token refresh events from the platform client
   * @param userId The user ID whose token was refreshed
   * @param tokens The new tokens
   */
  protected async handleTokenRefresh(userId: string, token: AuthToken): Promise<void> {
    // Save the new tokens using the token manager
    await this.nearAuthService.saveTokens(userId, this.platform, token);
  }

  /**
   * Get tokens for a user
   * @param userId The user ID to get tokens for
   * @returns The user's tokens
   * @throws Error if tokens are not found or expired
   */
  async getTokensForUser(userId: string): Promise<AuthToken> {
    try {
      // Get tokens from token manager
      const tokens = await this.nearAuthService.getTokens(userId, this.platform);

      // Check if tokens are expired and need refresh
      if (tokens.expiresAt && tokens.expiresAt < Date.now() && tokens.refreshToken) {
        // Tokens are expired, try to refresh them
        return await this.refreshToken(userId);
      }

      return tokens;
    } catch (error) {
      throw createPlatformError(
        ApiErrorCode.UNAUTHORIZED,
        error instanceof Error ? error.message : 'Failed to get tokens',
        this.platform,
      );
    }
  }

  /**
   * Delete tokens for a user
   * @param userId The user ID to delete tokens for
   */
  async deleteTokensForUser(userId: string): Promise<void> {
    try {
      // Delete tokens using the token manager
      await this.nearAuthService.deleteTokens(userId, this.platform);
    } catch (error) {
      console.error(`Error deleting tokens for ${userId}:`, error);
      // Don't throw - deletion errors should not block the application
    }
  }

  /**
   * Initialize the authentication process
   * @param redirectUri The redirect URI for the OAuth callback (platform specific, internal url)
   * @param scopes The requested OAuth scopes
   * @returns The authentication URL and state, and optional codeVerifier (PKCE)
   * @throws PlatformError if the initialization fails
   */
  abstract initializeAuth(
    redirectUri: string,
    scopes: string[],
  ): Promise<{ authUrl: string; state: string; codeVerifier?: string }>;

  /**
   * Get the auth state data from storage
   * @param state The state parameter from the callback
   * @returns The complete auth state data
   * @throws Error if the state is invalid or expired
   */
  async getAuthState(state: string): Promise<AuthState> {
    try {
      // Get the auth state from KV
      const authState = await this.kvStore.get<AuthState>([state]);

      if (!authState) {
        console.error(`[BasePlatformAuth.getAuthState] State not found or expired in KV for key: ${state}`); // Added Log
        throw new Error('Invalid or expired state');
      }

      return authState;
    } catch (error) {
      console.error('Error getting auth state:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to retrieve auth state');
    }
  }
  /**
   * Handle the OAuth callback
   * @param code The authorization code from the OAuth callback
   * @param state The state parameter from the callback
   * @returns The user ID, tokens, and success URL
   * @throws PlatformError if the callback handling fails
   */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ userId: string; token: AuthToken; successUrl: string }> {
    try {
      // Get the auth state using the getAuthState method
      const authState = await this.getAuthState(state);

      // Exchange the code for tokens using platform-specific implementation
      const { userId, token } = await this.exchangeCodeForTokens(
        code,
        authState.redirectUri,
        authState.codeVerifier,
      );

      // Link the account to the NEAR wallet
      await this.linkAccountToNear(authState.signerId, userId, token);

      // Delete the auth state from KV
      await this.kvStore.delete([state]);

      return {
        userId,
        token,
        successUrl: authState.successUrl,
      };
    } catch (error) {
      console.error('Error handling callback:', error);
      throw error;
    }
  }

  /**
   * Link a platform account to a NEAR wallet
   * @param signerId NEAR account ID
   * @param userId User ID on the platform
   * @param tokens The tokens to link
   */
  protected async linkAccountToNear(
    signerId: string,
    userId: string,
    token: AuthToken,
  ): Promise<void> {
    try {
      // Save tokens to token storage
      await this.nearAuthService.saveTokens(userId, this.platform, token);

      // Link the account in NEAR auth service
      await this.nearAuthService.linkAccount(signerId, this.platform, userId);

      console.log(`Linked ${this.platform} account ${userId} to NEAR wallet ${signerId}`);
    } catch (error) {
      console.error(`Error linking ${this.platform} account to NEAR wallet:`, error);
      throw new Error(`Failed to link ${this.platform} account to NEAR wallet`);
    }
  }

  /**
   * Exchange an authorization code for tokens
   * This is a platform-specific implementation that must be provided by subclasses
   * @param code The authorization code from the OAuth callback
   * @param redirectUri The redirect URI used in the initial request
   * @param codeVerifier The PKCE code verifier (if applicable)
   * @returns The user ID and tokens
   * @throws PlatformError if the exchange fails
   */
  protected abstract exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<{ userId: string; token: AuthToken }>;

  /**
   * Refresh a user's access token
   * This method manages the entire refresh process including storage
   * @param userId The user ID whose token should be refreshed
   * @returns The new tokens
   * @throws PlatformError if the refresh fails
   */
  async refreshToken(userId: string): Promise<any> {
    try {
      // Get current tokens
      const tokens = await this.nearAuthService.getTokens(userId, this.platform);

      if (!tokens.refreshToken) {
        throw createPlatformError(
          ApiErrorCode.UNAUTHORIZED,
          'No refresh token available',
          this.platform,
        );
      }

      // Get platform client
      const client = this.getPlatformClient();

      try {
        // Refresh token with platform API
        const newTokens = await client.refreshPlatformToken(tokens.refreshToken);

        // Save new tokens
        await this.nearAuthService.saveTokens(userId, this.platform, newTokens);

        return newTokens;
      } catch (error) {
        // Handle specific errors
        if (error instanceof PlatformError) {
          if (error.code === ApiErrorCode.UNAUTHORIZED) {
            // If the token is invalid (UNAUTHORIZED), delete it
            await this.nearAuthService.deleteTokens(userId, this.platform);
          }
          throw error;
        }

        // Create a platform error for unknown errors
        throw createPlatformError(
          ApiErrorCode.UNAUTHORIZED,
          error instanceof Error ? error.message : 'Failed to refresh token',
          this.platform,
        );
      }
    } catch (error) {
      if (error instanceof PlatformError) {
        throw error;
      }

      console.error(`Error refreshing token for ${userId}:`, error);
      // Create a platform error for unknown errors
      throw createPlatformError(
        ApiErrorCode.UNAUTHORIZED,
        error instanceof Error ? error.message : 'Failed to refresh token',
        this.platform,
      );
    }
  }

  /**
   * Revoke a user's tokens
   * This method manages the entire revocation process including storage
   * @param userId The user ID whose tokens should be revoked
   * @returns True if the revocation was successful
   * @throws PlatformError if the revocation fails
   */
  async revokeToken(userId: string): Promise<boolean> {
    try {
      // Get current tokens
      const tokens = await this.nearAuthService.getTokens(userId, this.platform);

      // Get platform client
      const client = this.getPlatformClient();

      try {
        // Revoke token with platform API
        await client.revokePlatformToken(tokens.accessToken, tokens.refreshToken);
      } catch (error) {
        // Log but continue - we still want to delete the tokens locally
        console.error(`Error revoking tokens with platform API for ${userId}:`, error);
      }

      // Delete tokens from storage using token manager
      await this.nearAuthService.deleteTokens(userId, this.platform);

      return true;
    } catch (error) {
      console.error(`Error revoking token for ${userId}:`, error);

      // If it's just a storage error, we can still consider it a success
      // since the tokens are likely already revoked on the platform
      if (error instanceof Error && error.message.includes('not found')) {
        return true;
      }

      return false;
    }
  }

  /**
   * Get the platform client
   * @returns The platform client
   */
  abstract getPlatformClient(): PlatformClient;
}
