import { Platform, PlatformName } from '@crosspost/types';
import { Context } from '../../deps.ts';
import { NearAuthService } from '../../src/infrastructure/security/near-auth-service.ts';
import { AuthToken } from '../../src/infrastructure/storage/auth-token-storage.ts';
import { mockKvStore } from './kv-store-mock.ts';

/**
 * Mock implementation of the NearAuthService for testing
 */

// Mock token
export const mockToken = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  expiresAt: Date.now() + 3600000,
  tokenType: 'oauth2',
};

// Mock NEAR auth data
export const mockNearAuthData = {
  account_id: 'test.near',
  public_key: 'ed25519:mock-public-key',
  signature: 'mock-signature',
  message: 'mock-message',
  nonce: 'mock-nonce',
  recipient: 'crosspost.near',
};

// Mock NearAuthService
export class MockNearAuthService extends NearAuthService {
  constructor(private mockEnv: any = {}) {
    super(
      mockEnv,
      {} as any,
      mockKvStore,
    );
  }

  /**
   * Validate NEAR auth signature from request headers without checking authorization status
   * @param c The Hono context
   * @returns The signer ID from the validated token
   */
  override async validateNearAuthSignature(c: Context): Promise<string> {
    return 'test.near';
  }

  /**
   * Extract and validate NEAR auth data from request headers
   * @param c The Hono context
   * @returns Validated NEAR auth data and result
   */
  override async extractAndValidateNearAuth(c: Context): Promise<{
    authData: any;
    signerId: string;
  }> {
    return {
      authData: mockNearAuthData,
      signerId: 'test.near',
    };
  }

  /**
   * Get tokens for a user
   * @param userId The user ID to get tokens for
   * @param platform The platform name (e.g., 'twitter')
   * @returns The user's tokens
   */
  override async getTokens(userId: string, platform: PlatformName): Promise<AuthToken> {
    return mockToken;
  }

  /**
   * Save tokens for a user
   * @param userId The user ID to save tokens for
   * @param platform The platform name (e.g., 'twitter')
   * @param token The tokens to save
   */
  override async saveTokens(
    userId: string,
    platform: PlatformName,
    token: AuthToken,
  ): Promise<void> {
    // Mock implementation - do nothing
  }

  /**
   * Delete tokens for a user
   * @param userId The user ID to delete tokens for
   * @param platform The platform name (e.g., 'twitter')
   */
  override async deleteTokens(userId: string, platform: PlatformName): Promise<void> {
    // Mock implementation - do nothing
  }

  /**
   * List all connected accounts for a NEAR wallet
   * @param signerId NEAR account ID
   * @returns Array of platform and userId pairs
   */
  override async listConnectedAccounts(
    signerId: string,
  ): Promise<Array<{ platform: PlatformName; userId: string; connectedAt: string }>> {
    return [
      {
        platform: Platform.TWITTER,
        userId: 'test-user-id',
        connectedAt: '2025-04-21T10:00:00.000Z', // Fixed timestamp for testing
      },
    ];
  }

  /**
   * Check if a NEAR account is authorized
   * @param signerId NEAR account ID
   * @returns True if the account is authorized, false otherwise
   */
  override async isNearAccountAuthorized(signerId: string): Promise<boolean> {
    return true; // Always authorized for testing
  }

  /**
   * Authorize a NEAR account
   * @param signerId NEAR account ID
   * @returns Result indicating success or failure
   */
  override async authorizeNearAccount(
    signerId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  /**
   * Unauthorize a NEAR account
   * @param signerId NEAR account ID
   * @returns Result indicating success or failure
   */
  override async unauthorizeNearAccount(
    signerId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  /**
   * Get the authorization status of a NEAR account
   * @param signerId NEAR account ID
   * @returns Authorization status
   */
  override async getNearAuthorizationStatus(signerId: string): Promise<number> {
    return 1; // Authorized with 1 connected account
  }

  /**
   * Link a NEAR account to a platform account
   * @param signerId NEAR account ID
   * @param platform Platform name
   * @param userId User ID on the platform
   */
  override async linkAccount(
    signerId: string,
    platform: PlatformName,
    userId: string,
  ): Promise<void> {
    // Mock implementation - do nothing
  }

  /**
   * Unlink a NEAR account from a platform account
   * @param signerId NEAR account ID
   * @param platform Platform name
   * @param userId User ID on the platform
   */
  override async unlinkAccount(
    signerId: string,
    platform: PlatformName,
    userId: string,
  ): Promise<void> {
    // Mock implementation - do nothing
  }

  /**
   * Check if a NEAR account has access to a platform account
   * @param signerId NEAR account ID
   * @param platform Platform name
   * @param userId User ID on the platform
   * @returns True if the NEAR account has access to the platform account
   */
  override async hasAccess(
    signerId: string,
    platform: PlatformName,
    userId: string,
  ): Promise<boolean> {
    return true;
  }

  /**
   * Get linked accounts for a NEAR account
   * @param signerId NEAR account ID
   * @returns Array of platform and userId pairs
   */
  override async getLinkedAccounts(
    signerId: string,
  ): Promise<Array<{ platform: PlatformName; userId: string; connectedAt: string }>> {
    return this.listConnectedAccounts(signerId);
  }
}

// Create a singleton instance for use in tests
export const nearAuthServiceMock = new MockNearAuthService();
