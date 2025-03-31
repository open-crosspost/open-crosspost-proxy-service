import { Env } from '../config/env.ts';
import { NearAuthService } from '../infrastructure/security/near-auth/near-auth.service.ts';
import { PlatformName } from '../types/platform.types.ts';

/**
 * Account Linking Utilities
 * Common functions for linking social media accounts to NEAR wallets
 */

/**
 * Link a social media account to a NEAR wallet
 * @param signerId NEAR account ID
 * @param platform Platform name (e.g., Platform.TWITTER)
 * @param userId User ID on the platform
 * @param tokens Tokens for the platform
 * @param env Environment configuration
 */
export async function linkAccountToNear(
  signerId: string,
  platform: PlatformName,
  userId: string,
  tokens: any,
  env: Env,
): Promise<void> {
  try {
    // Create NEAR auth service
    const nearAuthService = new NearAuthService(env);

    // Store the token in the NEAR auth service
    await nearAuthService.storeToken(signerId, platform, userId, tokens);

    console.log(`Linked ${platform} account ${userId} to NEAR wallet ${signerId}`);
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
 * @param env Environment configuration
 */
export async function unlinkAccountFromNear(
  signerId: string,
  platform: PlatformName,
  userId: string,
  env: Env,
): Promise<void> {
  try {
    // Create NEAR auth service
    const nearAuthService = new NearAuthService(env);

    // Delete the token from the NEAR auth service
    await nearAuthService.deleteToken(signerId, platform, userId);

    console.log(`Unlinked ${platform} account ${userId} from NEAR wallet ${signerId}`);
  } catch (error) {
    console.error(`Error unlinking ${platform} account from NEAR wallet:`, error);
    throw new Error(`Failed to unlink ${platform} account from NEAR wallet`);
  }
}

/**
 * Get all accounts linked to a NEAR wallet
 * @param signerId NEAR account ID
 * @param env Environment configuration
 * @returns Array of platform and userId pairs
 */
export async function getLinkedAccounts(
  signerId: string,
  env: Env,
): Promise<Array<{ platform: string; userId: string }>> {
  try {
    // Create NEAR auth service
    const nearAuthService = new NearAuthService(env);

    // Get all connected accounts
    return await nearAuthService.listConnectedAccounts(signerId);
  } catch (error) {
    console.error(`Error getting linked accounts for NEAR wallet:`, error);
    return [];
  }
}
