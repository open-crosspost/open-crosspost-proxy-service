import { PlatformName, UserProfile } from '@crosspost/types';
import { pluginClient } from '../../infrastructure/rpc/client.js';
import { NearAuthService } from '../../infrastructure/security/near-auth-service.js';
import { AuthToken } from '../../infrastructure/storage/auth-token-storage.js';
import { PrefixedKvStore } from '../../utils/kv-store.utils.js';

interface AuthState {
  redirectUri: string;
  codeVerifier: string;
  state: string;
  createdAt: number;
  successUrl: string;
  errorUrl: string;
  signerId: string;
  redirect: boolean;
  origin: string;
}

export class AuthService {
  constructor(
    private nearAuthService: NearAuthService,
    private authStateStore: PrefixedKvStore,
  ) {}

  /**
   * Initialize the authentication process
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @param signerId NEAR account ID for linking
   * @param redirectUri The redirect URI for the OAuth callback
   * @param scopes The requested OAuth scopes
   * @param successUrl The URL to redirect to on successful authentication
   * @param errorUrl The URL to redirect to on authentication failure
   * @returns The authentication URL and state
   */
  async initializeAuth(
    platform: PlatformName,
    signerId: string,
    redirectUri: string,
    scopes: string[],
    successUrl: string,
    errorUrl?: string,
    redirect: boolean = true,
    origin?: string,
  ): Promise<{ authUrl: string; state: string; codeVerifier?: string }> {
    try {
      // Generate a random state for CSRF protection
      const state = crypto.randomUUID();

      // Store the auth state in Deno KV
      const authState: AuthState = {
        redirectUri,
        codeVerifier: '', // Not used in this flow
        state,
        createdAt: Date.now(),
        successUrl: successUrl,
        errorUrl: errorUrl || successUrl,
        signerId, // Store the NEAR account ID
        redirect,
        origin: origin || successUrl, // Use successUrl as fallback for origin
      };

      // Store the state in KV with 1 hour expiration, this is needed for the callback
      await this.authStateStore.set([state], authState, {
        expireIn: 3600000, // 1 hour in milliseconds
      });

      // Get auth URL from plugin server
      const authUrl = await pluginClient[platform.toLowerCase()].auth.getAuthUrl({
        redirectUri,
        state,
        scopes,
      });

      return { authUrl, state };
    } catch (error) {
      console.error('Error initializing auth:', error);
      throw error;
    }
  }

  /**
   * Handle the OAuth callback
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @param code The authorization code from the OAuth callback
   * @param state The state parameter from the callback
   * @returns The user ID, tokens, success URL, redirect flag, and origin
   */
  async handleCallback(
    platform: PlatformName,
    code: string,
    state: string,
  ): Promise<{
    userId: string;
    token: AuthToken;
    successUrl: string;
    redirect: boolean;
    origin: string;
  }> {
    try {
      // Get auth state from KV
      const authState = await this.authStateStore.get([state]) as AuthState;
      if (!authState) {
        throw new Error('Invalid or expired state');
      }

      // Exchange code for tokens via plugin server
      const token = await pluginClient[platform.toLowerCase()].auth.exchangeCodeForToken({
        code,
        redirectUri: authState.redirectUri,
        scopes: [], // Scopes not needed for exchange
      });

      // Extract userId from token (assuming it's included in the response)
      // This might need adjustment based on the actual token structure
      const userId = 'user123'; // TODO: Extract from token response

      return {
        userId,
        token,
        successUrl: authState.successUrl,
        redirect: authState.redirect,
        origin: authState.origin,
      };
    } catch (error) {
      console.error('Error handling callback:', error);
      throw error;
    }
  }

  /**
   * Refresh a user's access token
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @param userId The user ID whose token should be refreshed
   * @returns The new tokens
   */
  async refreshToken(platform: PlatformName, userId: string): Promise<AuthToken> {
    try {
      // Get existing tokens
      const existingTokens = await this.nearAuthService.getTokens(userId, platform);

      // Refresh via plugin server
      const token = await pluginClient[platform.toLowerCase()].auth.refreshToken({
        refreshToken: existingTokens.refreshToken!,
        scope: existingTokens.scope,
      });

      // Save refreshed tokens
      await this.nearAuthService.saveTokens(userId, platform, token);

      return token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  }

  /**
   * Revoke a user's tokens
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @param userId The user ID whose tokens should be revoked
   * @returns True if the tokens were revoked
   */
  async revokeToken(platform: PlatformName, userId: string): Promise<boolean> {
    try {
      // Get existing tokens
      const tokens = await this.nearAuthService.getTokens(userId, platform);

      // Revoke via plugin server
      const success = await pluginClient[platform.toLowerCase()].auth.revokeToken({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      // Delete tokens from storage
      await this.nearAuthService.deleteTokens(userId, platform);

      return success;
    } catch (error) {
      console.error('Error revoking token:', error);
      throw error;
    }
  }

  /**
   * Check if a user has valid tokens
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @param userId The user ID to check
   * @returns True if the user has valid tokens
   */
  async hasValidTokens(platform: PlatformName, userId: string): Promise<boolean> {
    try {
      // First try to get existing tokens
      const tokens = await this.nearAuthService.getTokens(userId, platform);

      // If tokens aren't expired, they're valid
      if (tokens.expiresAt && tokens.expiresAt > Date.now()) {
        return true;
      }

      // If tokens are expired but we have a refresh token, try refreshing
      if (tokens.refreshToken) {
        try {
          await this.refreshToken(platform, userId);
          return true;
        } catch (refreshError) {
          // If refresh fails, return false
          console.error('Token refresh failed:', refreshError);
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking tokens:', error);
      return false;
    }
  }

  /**
   * Link a social media account to a NEAR wallet
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   * @returns Success status
   */
  async linkAccount(
    signerId: string,
    platform: PlatformName,
    userId: string,
  ): Promise<boolean> {
    try {
      // Get the tokens for the user (should already be saved)
      const tokens = await this.nearAuthService.getTokens(userId, platform);

      // Link the account
      await this.nearAuthService.linkAccount(signerId, platform, userId);

      return true;
    } catch (error) {
      console.error(`Error linking ${platform} account to NEAR wallet:`, error);
      throw new Error(`Failed to link ${platform} account to NEAR wallet`);
    }
  }

  /**
   * Unlink a social media account from a NEAR wallet
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   */
  async unlinkAccount(
    signerId: string,
    platform: PlatformName,
    userId: string,
  ): Promise<void> {
    try {
      await this.nearAuthService.unlinkAccount(signerId, platform, userId);
    } catch (error) {
      console.error(`Error unlinking ${platform} account from NEAR wallet:`, error);
      throw error;
    }
  }

  /**
   * Get a user's profile
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @param userId The user ID to get the profile for
   * @param forceRefresh Whether to force a refresh from the API
   * @returns The user profile or null if not found
   */
  async getUserProfile(
    platform: PlatformName,
    userId: string,
    forceRefresh = false,
  ): Promise<UserProfile | null> {
    try {
      // Get tokens for the user
      const tokens = await this.nearAuthService.getTokens(userId, platform);

      // Get profile via plugin server
      const profile = await pluginClient[platform.toLowerCase()].profile.get({
        userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      return profile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Check if a NEAR account has access to a platform account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   * @returns True if the NEAR account has access to the platform account
   */
  async hasAccess(signerId: string, platform: PlatformName, userId: string): Promise<boolean> {
    try {
      return await this.nearAuthService.hasAccess(signerId, platform, userId);
    } catch (error) {
      console.error('Error checking access:', error);
      return false;
    }
  }
}
