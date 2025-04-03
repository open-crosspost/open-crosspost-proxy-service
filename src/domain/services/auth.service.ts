import { Env } from '../../config/env.ts';
import { DEFAULT_CONFIG } from '../../config/index.ts';
import { PlatformAuth } from '../../infrastructure/platform/abstract/platform-auth.interface.ts';
import { PlatformProfile } from '../../infrastructure/platform/abstract/platform-profile.interface.ts';
import { TwitterAuth } from '../../infrastructure/platform/twitter/twitter-auth.ts';
import { TwitterProfile } from '../../infrastructure/platform/twitter/twitter-profile.ts';
import { TokenStorage, AuthToken } from '../../infrastructure/storage/auth-token-storage.ts';
import { Platform, PlatformName } from '@crosspost/types';
import { linkAccountToNear } from '../../utils/account-linking.utils.ts';
import { UserProfile } from '../../types/user-profile.types.ts';

/**
 * Auth Service
 * Domain service for authentication-related operations
 */
export class AuthService {
  private platformAuthMap: Map<PlatformName, PlatformAuth>;
  private platformProfileMap: Map<PlatformName, PlatformProfile>;
  private tokenStorage: TokenStorage;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.tokenStorage = new TokenStorage(env.ENCRYPTION_KEY, env);

    // Initialize supported platforms
    this.platformAuthMap = new Map();
    this.platformAuthMap.set(Platform.TWITTER, new TwitterAuth(env));
    // Add more platforms as they're implemented
    // this.platformAuthMap.set(Platform.LINKEDIN, new LinkedInAuth(env));

    // Initialize platform profiles
    this.platformProfileMap = new Map();
    this.platformProfileMap.set(Platform.TWITTER, new TwitterProfile(env));
    // Add more platform profiles as they're implemented
    // this.platformProfileMap.set(Platform.LINKEDIN, new LinkedInProfile(env));
  }

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
    scopes: string[] = DEFAULT_CONFIG.AUTH.DEFAULT_SCOPES,
    successUrl?: string,
    errorUrl?: string,
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
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @param state The state parameter from the callback
   * @returns The auth state data including successUrl and errorUrl
   */
  async getAuthState(
    platform: PlatformName,
    state: string,
  ): Promise<{ successUrl: string; errorUrl: string; signerId: string } | null> {
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
   * @param platform The platform name (e.g., Platform.TWITTER)
   * @param code The authorization code from the OAuth callback
   * @param state The state parameter from the callback
   * @returns The user ID and tokens
   */
  async handleCallback(
    platform: PlatformName,
    code: string,
    state: string,
  ): Promise<{ userId: string; tokens: AuthToken; successUrl: string }> {
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
      return await this.tokenStorage.hasTokens(userId, platform);
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

      // Link the account using the utility function
      await linkAccountToNear(signerId, platform, userId, tokens, this.env);

      return true;
    } catch (error) {
      console.error(`Error linking ${platform} account to NEAR wallet:`, error);
      throw new Error(`Failed to link ${platform} account to NEAR wallet`);
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
}
