import { ApiErrorCode, PlatformName } from '@crosspost/types';
import { Context } from '../../../deps.ts';
import { Env } from '../../config/env.ts';
import { NearAuthData, parseAuthToken, validateSignature } from '../../deps.ts';
import { createApiError } from '../../errors/api-error.ts';
import { PrefixedKvStore } from '../../utils/kv-store.utils.ts';
import { AuthToken, TokenStorage } from '../storage/auth-token-storage.ts';
import { TokenAccessLogger } from './token-access-logger.ts';

/**
 * NearAuthService
 * Centralized manager for NEAR authentication and token operations
 */
export class NearAuthService {
  /**
   * Get all platform accounts linked to a NEAR account
   * @param signerId NEAR account ID
   * @returns Array of platform and userId pairs
   */
  async getLinkedAccounts(
    signerId: string,
  ): Promise<Array<{ platform: PlatformName; userId: string; connectedAt: string }>> {
    try {
      return await this.listConnectedAccounts(signerId);
    } catch (error) {
      console.error(`Error getting linked accounts for NEAR account ${signerId}:`, error);
      return [];
    }
  }
  constructor(
    private env: Env,
    private tokenStorage: TokenStorage,
    private nearAuthKvStore: PrefixedKvStore,
    private tokenAccessLogger?: TokenAccessLogger,
  ) {}

  /**
   * Validate NEAR auth signature from request headers without checking authorization status
   * @param c The Hono context
   * @returns The signer ID from the validated token
   */
  async validateNearAuthSignature(c: Context): Promise<string> {
    // Extract NEAR auth data from Authorization header
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createApiError(ApiErrorCode.UNAUTHORIZED, 'Missing or invalid Authorization header');
    }

    // Extract the token part (after 'Bearer ')
    const token = parseAuthToken(authHeader.substring(7));

    // Validate signature
    const result = await validateSignature(token);

    if (!result.valid) {
      throw createApiError(ApiErrorCode.UNAUTHORIZED, result.error);
    }

    // Return the signerId from the validated token
    return token.account_id;
  }

  /**
   * Extract NEAR account ID from X-Near-Account header
   * @param c The Hono context
   * @returns The NEAR account ID from the header
   * @throws {ApiError} If the header is missing
   */
  extractNearAccountHeader(c: Context): string {
    const nearAccount = c.req.header('X-Near-Account');
    if (!nearAccount) {
      throw createApiError(ApiErrorCode.UNAUTHORIZED, 'Missing X-Near-Account header');
    }
    return nearAccount;
  }

  /**
   * Extract and validate NEAR auth data from request headers
   * @param c The Hono context
   * @returns Validated NEAR auth data and result
   */
  async extractAndValidateNearAuth(c: Context): Promise<{
    authData: NearAuthData;
    signerId: string;
  }> {
    // First validate the signature and get the signer ID
    const signerId = await this.validateNearAuthSignature(c);

    // Get the token again to return the full auth data
    const token = parseAuthToken(c.req.header('Authorization')!.substring(7));

    // Check if the NEAR account is authorized (skip check for /auth/authorize/near)
    if (!c.req.path.endsWith('/auth/authorize/near')) {
      const authStatus = await this.getNearAuthorizationStatus(signerId);
      if (authStatus < 0) { // -1 means not authorized
        throw createApiError(ApiErrorCode.UNAUTHORIZED, 'NEAR account is not authorized');
      }
    }

    return {
      authData: token,
      signerId,
    };
  }

  // ===== Token Storage Methods =====

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
          throw createApiError(
            ApiErrorCode.UNAUTHORIZED,
            'Tokens expired and no refresh token available',
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
      await this.tokenStorage.saveTokens(userId, token, platform);
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
      await this.tokenStorage.deleteTokens(userId, platform);
    } catch (error) {
      console.error(`Error deleting tokens for ${userId} on ${platform}:`, error);
      // Don't throw - deletion errors should not block the application
    }
  }

  // ===== NEAR Account Management Methods =====

  /**
   * List all connected accounts for a NEAR wallet
   * @param signerId NEAR account ID
   * @returns Array of platform and userId pairs
   */
  async listConnectedAccounts(
    signerId: string,
  ): Promise<Array<{ platform: PlatformName; userId: string; connectedAt: string }>> {
    try {
      const indexKey = ['index', signerId];
      const accounts = await this.nearAuthKvStore.get<
        Array<{ platform: PlatformName; userId: string; connectedAt: string }>
      >(
        indexKey,
      );

      return accounts || [];
    } catch (error) {
      console.error('Error listing connected accounts:', error);
      return [];
    }
  }

  /**
   * Add a connected account to the index
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   */
  private async addToConnectedAccountsIndex(
    signerId: string,
    platform: PlatformName,
    userId: string,
  ): Promise<void> {
    try {
      const indexKey = ['index', signerId];
      const accounts = await this.nearAuthKvStore.get<
        Array<{ platform: PlatformName; userId: string; connectedAt: string }>
      >(
        indexKey,
      ) || [];

      // Check if the account is already in the index
      const exists = accounts.some((acc) => acc.platform === platform && acc.userId === userId);

      if (!exists) {
        accounts.push({
          platform,
          userId,
          connectedAt: new Date().toISOString(),
        });
        await this.nearAuthKvStore.set(indexKey, accounts);
      }
    } catch (error) {
      console.error('Error adding to connected accounts index:', error);
      throw new Error('Failed to update connected accounts index');
    }
  }

  /**
   * Remove a connected account from the index
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   */
  private async removeFromConnectedAccountsIndex(
    signerId: string,
    platform: PlatformName,
    userId: string,
  ): Promise<void> {
    try {
      const indexKey = ['index', signerId];
      const accounts = await this.nearAuthKvStore.get<
        Array<{ platform: PlatformName; userId: string; connectedAt: string }>
      >(
        indexKey,
      );

      if (!accounts) {
        return;
      }

      // Filter out the account to remove
      const updatedAccounts = accounts.filter(
        (acc) => !(acc.platform === platform && acc.userId === userId),
      );

      await this.nearAuthKvStore.set(indexKey, updatedAccounts);
    } catch (error) {
      console.error('Error removing from connected accounts index:', error);
      throw new Error('Failed to update connected accounts index');
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
      // Add the link to the index
      await this.addToConnectedAccountsIndex(signerId, platform, userId);
      console.log(`Linked ${platform}:${userId} to NEAR account ${signerId}`);
    } catch (error) {
      console.error(
        `Error linking NEAR account ${signerId} to ${platform} account ${userId}:`,
        error,
      );
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
      // Remove the link reference from the index in KV store
      await this.removeFromConnectedAccountsIndex(signerId, platform, userId);

      // Delete the actual tokens from TokenStorage
      await this.deleteTokens(userId, platform);

      console.log(
        `Unlinked ${platform}:${userId} from ${signerId} and deleted associated tokens.`,
      );
    } catch (error) {
      console.error(
        `Error unlinking NEAR account ${signerId} from ${platform} account ${userId}:`,
        error,
      );
      throw error;
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
      const accounts = await this.listConnectedAccounts(signerId);
      return accounts.some((acc) => acc.platform === platform && acc.userId === userId);
    } catch (error) {
      console.error(
        `Error checking access for NEAR account ${signerId} to ${platform} account ${userId}:`,
        error,
      );
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
      const key = [signerId];
      const value = { authorized: true, timestamp: new Date().toISOString() };
      await this.nearAuthKvStore.set(key, value);

      console.log(`NEAR account ${signerId} authorized successfully.`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to store authorization';
      console.error(
        `Error authorizing NEAR account ${signerId}:`,
        errorMessage,
        error,
      );
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if a NEAR account is authorized.
   * @param signerId NEAR account ID.
   * @returns True if the account is authorized, false otherwise.
   */
  async isNearAccountAuthorized(signerId: string): Promise<boolean> {
    try {
      const key = [signerId];
      const result = await this.nearAuthKvStore.get<{ authorized: boolean }>(key);

      return result?.authorized === true;
    } catch (error) {
      console.error(`Error checking authorization for NEAR account ${signerId}:`, error);
      return false; // Assume not authorized if there's an error
    }
  }

  /**
   * Unauthorize a NEAR account, removing its ability to interact with the proxy.
   * @param signerId The NEAR account ID to unauthorize.
   * @returns Result indicating success or failure.
   */
  async unauthorizeNearAccount(
    signerId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const key = [signerId];
      // Check if the key exists before attempting deletion
      const existing = await this.nearAuthKvStore.get(key);
      if (existing === null) {
        console.log(`NEAR account ${signerId} was already not authorized.`);
        // Consider it a success if the goal state (unauthorized) is already met
        return { success: true };
      }

      await this.nearAuthKvStore.delete(key);

      console.log(`NEAR account ${signerId} unauthorized successfully.`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to remove authorization';
      console.error(
        `Error unauthorizing NEAR account ${signerId}:`,
        errorMessage,
        error,
      );
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
      const isAuthorized = await this.isNearAccountAuthorized(signerId);

      if (!isAuthorized) {
        return -1; // Not authorized
      }

      // If authorized, check how many accounts are connected
      const linkedAccounts = await this.listConnectedAccounts(signerId);
      return linkedAccounts.length; // 0 if no accounts, >0 if accounts connected
    } catch (error) {
      console.error(`Error checking authorization status for NEAR account ${signerId}:`, error);
      return -1; // Default to not authorized on error
    }
  }
}
