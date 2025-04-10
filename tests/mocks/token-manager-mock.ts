import { PlatformName } from "@crosspost/types";
import { AuthToken } from "../../src/infrastructure/storage/auth-token-storage.ts";
import { tokenStorageMock } from "./token-storage-mock.ts";
import { mockToken } from "./near-auth-service-mock.ts";

/**
 * Mock implementation of the TokenManager class for testing
 */
export class TokenManagerMock {
  private tokenStorage = tokenStorageMock;

  constructor() {
    // Initialize with default mock token
    this.tokenStorage.setToken("test-user-id", "twitter", mockToken);
  }

  /**
   * Get tokens for a user
   * @param userId The user ID to get tokens for
   * @param platform The platform name (e.g., 'twitter')
   * @returns The user's tokens
   */
  async getTokens(userId: string, platform: PlatformName): Promise<AuthToken> {
    return this.tokenStorage.getTokens(userId, platform);
  }

  /**
   * Save tokens for a user
   * @param userId The user ID to save tokens for
   * @param platform The platform name (e.g., 'twitter')
   * @param token The tokens to save
   */
  async saveTokens(userId: string, platform: PlatformName, token: AuthToken): Promise<void> {
    await this.tokenStorage.saveTokens(userId, token, platform);
  }

  /**
   * Delete tokens for a user
   * @param userId The user ID to delete tokens for
   * @param platform The platform name (e.g., 'twitter')
   */
  async deleteTokens(userId: string, platform: PlatformName): Promise<void> {
    await this.tokenStorage.deleteTokens(userId, platform);
  }

  /**
   * Check if tokens exist for a user
   * @param userId The user ID to check
   * @param platform The platform name (e.g., 'twitter')
   * @returns True if tokens exist
   */
  async hasTokens(userId: string, platform: PlatformName): Promise<boolean> {
    return this.tokenStorage.hasTokens(userId, platform);
  }

  /**
   * Set a token for testing
   * @param userId The user ID
   * @param platform The platform name
   * @param token The token to set
   */
  setToken(userId: string, platform: PlatformName, token: AuthToken): void {
    this.tokenStorage.setToken(userId, platform, token);
  }

  /**
   * Clear all tokens
   */
  clear(): void {
    this.tokenStorage.clear();
  }

  // Mock methods for account linking
  async linkAccount(signerId: string, platform: PlatformName, userId: string): Promise<void> {
    // No-op for testing
  }

  async unlinkAccount(signerId: string, platform: PlatformName, userId: string): Promise<void> {
    // No-op for testing
  }

  async getLinkedAccounts(signerId: string): Promise<Array<{ platform: PlatformName; userId: string }>> {
    return [{ platform: "twitter", userId: "test-user-id" }];
  }

  async hasAccess(signerId: string, platform: PlatformName, userId: string): Promise<boolean> {
    return true;
  }
}

// Create a singleton instance
export const tokenManagerMock = new TokenManagerMock();
