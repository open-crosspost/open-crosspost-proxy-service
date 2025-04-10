import { PlatformName } from "@crosspost/types";
import { mockKvStore } from "./kv-store-mock.ts";

/**
 * Mock implementation of the NearAuthService for testing
 */

// Mock token
export const mockToken = {
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
  expiresAt: Date.now() + 3600000,
  tokenType: "oauth2"
};

// Mock NearAuthService
export class MockNearAuthService {
  constructor(private env: any) {}

  /**
   * Store a token for a NEAR account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   * @param token Token to store
   */
  async storeToken(
    signerId: string,
    platform: PlatformName,
    userId: string,
    token: any,
  ): Promise<void> {
    const key = ["token", signerId, platform, userId];
    await mockKvStore.set(key, token);
  }

  /**
   * Get a token for a NEAR account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   * @returns Token or null if not found
   */
  async getToken(signerId: string, platform: PlatformName, userId: string): Promise<any | null> {
    // Always return the mock token for testing
    return mockToken;
  }

  /**
   * Delete a token for a NEAR account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   */
  async deleteToken(signerId: string, platform: PlatformName, userId: string): Promise<void> {
    const key = ["token", signerId, platform, userId];
    await mockKvStore.delete(key);
  }

  /**
   * List all connected accounts for a NEAR wallet
   * @param signerId NEAR account ID
   * @returns Array of platform and userId pairs
   */
  async listConnectedAccounts(
    signerId: string,
  ): Promise<Array<{ platform: PlatformName; userId: string }>> {
    return [
      { platform: "twitter" as PlatformName, userId: "test-user-id" }
    ];
  }

  /**
   * Check if a NEAR account is authorized
   * @param signerId NEAR account ID
   * @returns True if the account is authorized, false otherwise
   */
  async isNearAccountAuthorized(signerId: string): Promise<boolean> {
    return true; // Always authorized for testing
  }

  /**
   * Authorize a NEAR account
   * @param signerId NEAR account ID
   * @returns Result indicating success or failure
   */
  async authorizeNearAccount(
    signerId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  /**
   * Unauthorize a NEAR account
   * @param signerId NEAR account ID
   * @returns Result indicating success or failure
   */
  async unauthorizeNearAccount(
    signerId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }
}

// Mock verifyPlatformAccess function
export async function mockVerifyPlatformAccess(
  signerId: string,
  platform: PlatformName,
  userId: string,
): Promise<any> {
  return mockToken;
}
