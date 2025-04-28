import { PlatformName, UserProfile } from '@crosspost/types';
import {
  AuthState,
  PlatformAuth,
} from '../../infrastructure/platform/abstract/platform-auth.interface.ts';
import { PlatformProfile } from '../../infrastructure/platform/abstract/platform-profile.interface.ts';
import { NearAuthService } from '../../infrastructure/security/near-auth-service.ts';
import { AuthToken } from '../../infrastructure/storage/auth-token-storage.ts';
import { PrefixedKvStore } from '../../utils/kv-store.utils.ts';

export class AuthService {
  constructor(
    private nearAuthService: NearAuthService,
    private authStateStore: PrefixedKvStore,
    private platformAuthMap: Map<PlatformName, PlatformAuth>,
    private platformProfileMap: Map<PlatformName, PlatformProfile>,
  ) {}

  /**
   * Get the platform-specific auth implementation
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns The platform-specific auth implementation
   * @throws Error if the platform is not supported
   */
  getPlatformAuth(platform: PlatformName): PlatformAuth {
    const platformAuth = this.platformAuthMap.get(platform.toLowerCase() as PlatformName);
    if (!platformAuth) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return platformAuth;
  }

  /**
   * Get the platform-specific profile implementation
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @returns The platform-specific profile implementation
   * @throws Error if the platform is not supported
   */
  getPlatformProfile(platform: PlatformName): PlatformProfile {
    const platformProfile = this.platformProfileMap.get(platform.toLowerCase() as PlatformName);
    if (!platformProfile) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    return platformProfile;
  }

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
      // Get platform specific auth service
      const platformAuth = this.getPlatformAuth(platform);
      const result = await platformAuth.initializeAuth(redirectUri, scopes);
      const { state, codeVerifier } = result;

      // Store the auth state in Deno KV
      const authState: AuthState = {
        redirectUri,
        codeVerifier: codeVerifier || '',
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

      return result;
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
      const platformAuth = this.getPlatformAuth(platform);
      return await platformAuth.handleCallback(code, state);
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
      const platformAuth = this.getPlatformAuth(platform);
      return await platformAuth.refreshToken(userId);
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
      const platformAuth = this.getPlatformAuth(platform);
      return await platformAuth.revokeToken(userId);
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
          const platformAuth = this.getPlatformAuth(platform);
          const refreshedTokens = await platformAuth.refreshToken(userId);
          // Save the refreshed tokens
          await this.nearAuthService.saveTokens(userId, platform, refreshedTokens);
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
      // Get the tokens for the user
      const platformAuth = this.getPlatformAuth(platform);
      const tokens = await platformAuth.refreshToken(userId);

      // Save tokens and link the account
      await this.nearAuthService.saveTokens(userId, platform, tokens);
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
      const platformProfile = this.getPlatformProfile(platform);
      return await platformProfile.getUserProfile(userId, forceRefresh);
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
