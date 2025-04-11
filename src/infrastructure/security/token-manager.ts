import { Env } from '../../config/env.ts';
import { PlatformName } from '@crosspost/types';
import { TokenStorage, AuthToken } from '../storage/auth-token-storage.ts';
import { NearAuthService } from './near-auth/near-auth.service.ts';
import { ApiErrorCode, PlatformError } from '@crosspost/types';

/**
 * Token Manager
 * Centralized manager for token operations, coordinating between TokenStorage and NearAuthService
 */
export class TokenManager {
  constructor(
    private env: Env,
    private tokenStorage: TokenStorage,
    private nearAuthService: NearAuthService,
  ) {}

  /**
   * Get tokens for a user
   * @param userId The user ID to get tokens for
   * @param platform The platform name (e.g., 'twitter')
   * @returns The user's tokens
   * @throws Error if tokens are not found or expired
   */
  async getTokens(userId: string, platform: PlatformName): Promise<AuthToken> {
    try {
      // Get tokens from TokenStorage
      const tokens = await this.tokenStorage.getTokens(userId, platform);
      
      // Check if tokens are expired
      if (tokens.expiresAt && tokens.expiresAt < Date.now()) {
        // Tokens are expired, try to refresh them if a refresh token is available
        if (tokens.refreshToken) {
          console.log(`Tokens for ${userId} on ${platform} are expired. Attempting refresh.`);
          // The actual refresh will be handled by the platform auth service
          // This just returns the expired tokens, and the platform auth will handle refresh
          return tokens;
        } else {
          // No refresh token, delete the tokens
          await this.deleteTokens(userId, platform);
          throw new PlatformError(
            'Tokens expired and no refresh token available',
            platform,
            ApiErrorCode.UNAUTHORIZED,
            false
          );
        }
      }
      
      return tokens;
    } catch (error) {
      console.error(`Error getting tokens for ${userId} on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Save tokens for a user
   * @param userId The user ID to save tokens for
   * @param platform The platform name (e.g., 'twitter')
   * @param tokens The tokens to save
   */
  async saveTokens(userId: string, platform: PlatformName, token: AuthToken): Promise<void> {
    try {
      // Save tokens to TokenStorage
      await this.tokenStorage.saveTokens(userId, token, platform);
      
      // Update tokens in NearAuthService for all linked NEAR accounts
      try {
        const linkedAccounts = await this.nearAuthService.listConnectedAccounts(userId);
        for (const account of linkedAccounts) {
          if (account.platform === platform && account.userId === userId) {
            // Store reference to tokens in NearAuthService
            // We only store the userId and platform, not the actual tokens
            // This maintains the link between NEAR accounts and platform accounts
            await this.nearAuthService.storeToken(account.userId, platform, userId, {
              userId,
              platform,
              linkedAt: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error(`Error updating token references in NearAuthService for ${userId}:`, error);
        // Continue even if NearAuthService update fails - TokenStorage is updated
      }
    } catch (error) {
      console.error(`Error saving tokens for ${userId} on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Delete tokens for a user
   * @param userId The user ID to delete tokens for
   * @param platform The platform name (e.g., 'twitter')
   */
  async deleteTokens(userId: string, platform: PlatformName): Promise<void> {
    try {
      // Delete tokens from TokenStorage
      await this.tokenStorage.deleteTokens(userId, platform);
      
      // Update NearAuthService for all linked NEAR accounts
      try {
        const linkedAccounts = await this.nearAuthService.listConnectedAccounts(userId);
        for (const account of linkedAccounts) {
          if (account.platform === platform && account.userId === userId) {
            // Remove token reference from NearAuthService
            await this.nearAuthService.deleteToken(account.userId, platform, userId);
          }
        }
      } catch (error) {
        console.error(`Error removing token references from NearAuthService for ${userId}:`, error);
        // Continue even if NearAuthService update fails - TokenStorage is updated
      }
    } catch (error) {
      console.error(`Error deleting tokens for ${userId} on ${platform}:`, error);
      // Don't throw - deletion errors should not block the application
    }
  }

  /**
   * Check if tokens exist for a user
   * @param userId The user ID to check
   * @param platform The platform name (e.g., 'twitter')
   * @returns True if tokens exist
   */
  async hasTokens(userId: string, platform: PlatformName): Promise<boolean> {
    try {
      return await this.tokenStorage.hasTokens(userId, platform);
    } catch (error) {
      console.error(`Error checking tokens for ${userId} on ${platform}:`, error);
      return false;
    }
  }

  /**
   * Link a NEAR account to a platform account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., 'twitter')
   * @param userId User ID on the platform
   */
  async linkAccount(signerId: string, platform: PlatformName, userId: string): Promise<void> {
    try {
      // Store reference to tokens in NearAuthService
      await this.nearAuthService.storeToken(signerId, platform, userId, {
        userId,
        platform,
        linkedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error linking NEAR account ${signerId} to ${platform} account ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Unlink a NEAR account from a platform account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., 'twitter')
   * @param userId User ID on the platform
   */
  async unlinkAccount(signerId: string, platform: PlatformName, userId: string): Promise<void> {
    try {
      // Remove token reference from NearAuthService
      await this.nearAuthService.deleteToken(signerId, platform, userId);
    } catch (error) {
      console.error(`Error unlinking NEAR account ${signerId} from ${platform} account ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all platform accounts linked to a NEAR account
   * @param signerId NEAR account ID
   * @returns Array of platform and userId pairs
   */
  async getLinkedAccounts(signerId: string): Promise<Array<{ platform: PlatformName; userId: string }>> {
    try {
      return await this.nearAuthService.listConnectedAccounts(signerId);
    } catch (error) {
      console.error(`Error getting linked accounts for NEAR account ${signerId}:`, error);
      return [];
    }
  }

  /**
   * Check if a NEAR account has access to a platform account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., 'twitter')
   * @param userId User ID on the platform
   * @returns True if the NEAR account has access to the platform account
   */
  async hasAccess(signerId: string, platform: PlatformName, userId: string): Promise<boolean> {
    try {
      const token = await this.nearAuthService.getToken(signerId, platform, userId);
      return token !== null;
    } catch (error) {
      console.error(`Error checking access for NEAR account ${signerId} to ${platform} account ${userId}:`, error);
      return false;
    }
  }

  /**
   * Authorize a NEAR account for interaction with the proxy
   * @param signerId NEAR account ID
   * @returns Result indicating success or failure of authorization
   */
  async authorizeNearAccount(signerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.nearAuthService.authorizeNearAccount(signerId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to authorize NEAR account';
      console.error(`Error authorizing NEAR account ${signerId}:`, errorMessage, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Unauthorize a NEAR account, removing its ability to interact with the proxy
   * @param signerId NEAR account ID
   * @returns Result indicating success or failure of unauthorization
   */
  async unauthorizeNearAccount(signerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.nearAuthService.unauthorizeNearAccount(signerId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unauthorize NEAR account';
      console.error(`Error unauthorizing NEAR account ${signerId}:`, errorMessage, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check the authorization status of a NEAR account
   * @param signerId NEAR account ID
   * @returns Authorization status:
   *   -1: Not authorized
   *    0: Authorized but no accounts connected
   *   >0: Number of connected accounts
   */
  async getNearAuthorizationStatus(signerId: string): Promise<number> {
    try {
      // First check if the account is authorized
      const isAuthorized = await this.nearAuthService.isNearAccountAuthorized(signerId);
      
      if (!isAuthorized) {
        return -1; // Not authorized
      }
      
      // If authorized, check how many accounts are connected
      const linkedAccounts = await this.getLinkedAccounts(signerId);
      return linkedAccounts.length; // 0 if no accounts, >0 if accounts connected
    } catch (error) {
      console.error(`Error checking authorization status for NEAR account ${signerId}:`, error);
      return -1; // Default to not authorized on error
    }
  }
}
