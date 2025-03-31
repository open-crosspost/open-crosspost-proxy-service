import { BorshSchema } from 'borsher';
import { base58_to_binary } from 'npm:base58-js';
import nacl from 'npm:tweetnacl';
import { Env } from '../../../config/env.ts';
import { PlatformName } from '../../../types/platform.types.ts';
import { PrefixedKvStore } from '../../../utils/kv-store.utils.ts';
import {
  NearAuthData,
  nearAuthDataSchema,
  NearAuthPayload,
  NearAuthResult,
  PAYLOAD_SCHEMA,
} from './near-auth.types.ts';

/**
 * NEAR Authentication Service
 * Handles NEAR authentication validation
 */
export class NearAuthService {
  private readonly ED25519_PREFIX = 'ed25519:';
  private kvStore: PrefixedKvStore;

  constructor(private env: Env) {
    this.kvStore = new PrefixedKvStore(['near_auth']);
  }

  /**
   * Validate NEAR authentication data
   * @param authData NEAR authentication data
   * @returns Validation result
   */
  async validateNearAuth(authData: NearAuthData): Promise<NearAuthResult> {
    try {
      // Validate with Zod schema
      const validationResult = nearAuthDataSchema.safeParse(authData);

      if (!validationResult.success) {
        return {
          valid: false,
          error: `Missing required authentication data: ${
            JSON.stringify(validationResult.error.format())
          }`,
        };
      }

      // Use validated data
      const validatedData = validationResult.data;

      // Validate nonce
      const nonce = this.validateNonce(validatedData.nonce);

      // Create payload
      const payload: NearAuthPayload = {
        tag: 2147484061, // This is the tag value used in the Python implementation
        message: authData.message,
        nonce: nonce,
        receiver: authData.recipient || 'crosspost.near',
      };

      // Validate signature
      const isValid = await this.validateSignature(
        authData.public_key,
        authData.signature,
        payload,
      );

      if (!isValid) {
        return {
          valid: false,
          error: 'Invalid signature',
        };
      }

      return {
        valid: true,
        signerId: authData.account_id,
      };
    } catch (error: unknown) {
      console.error('Error validating NEAR authentication:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Error validating NEAR authentication';
      return {
        valid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Validate a cryptographic signature for a given payload using a specified public key
   * @param publicKey Public key in format 'ed25519:...'
   * @param signature Base64-encoded signature
   * @param payload Payload that was signed
   * @returns Whether the signature is valid
   */
  private async validateSignature(
    publicKey: string,
    signature: string,
    payload: NearAuthPayload,
  ): Promise<boolean> {
    try {
      // Serialize the payload using borsher
      const borshPayload = BorshSchema.serialize(BorshSchema.Struct(PAYLOAD_SCHEMA), payload);

      // Hash the payload using Web Crypto API
      const hashBuffer = await crypto.subtle.digest('SHA-256', borshPayload);
      const payloadHash = new Uint8Array(hashBuffer);

      // Decode the signature
      const signatureBytes = this.base64ToUint8Array(signature);

      // Decode the public key (remove ed25519: prefix if present)
      const publicKeyString = publicKey.startsWith(this.ED25519_PREFIX)
        ? publicKey.substring(this.ED25519_PREFIX.length)
        : publicKey;

      // Use base58_to_binary to decode the public key
      const publicKeyBytes = base58_to_binary(publicKeyString);

      // Verify the signature
      return nacl.sign.detached.verify(
        payloadHash,
        signatureBytes,
        publicKeyBytes,
      );
    } catch (error) {
      console.error('Error validating signature:', error);
      return false;
    }
  }

  /**
   * Validates a nonce and ensures it's a valid timestamp
   * @param nonce Nonce string
   * @returns Validated nonce as Uint8Array
   */
  private validateNonce(nonce: string): Uint8Array {
    // Convert nonce to a proper format (padded to 32 bytes)
    const paddedNonce = nonce.padStart(32, '0');
    const nonceBytes = this.stringToUint8Array(paddedNonce);

    // Convert to timestamp and validate
    const nonceInt = parseInt(nonce);
    const now = Date.now();

    if (isNaN(nonceInt)) {
      throw new Error('Invalid nonce format');
    }

    if (nonceInt > now) {
      throw new Error('Nonce is in the future');
    }

    // If the timestamp is older than 10 years, it is considered invalid
    // This forces apps to use unique nonces
    if (now - nonceInt > 10 * 365 * 24 * 60 * 60 * 1000) {
      throw new Error('Nonce is too old');
    }

    return nonceBytes;
  }

  /**
   * Convert base64 string to Uint8Array
   * @param base64 Base64 string
   * @returns Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Convert a string to Uint8Array
   * @param str String to convert
   * @returns Uint8Array
   */
  private stringToUint8Array(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

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
    try {
      const key = ['token', signerId, platform, userId];
      await this.kvStore.set(key, token);

      // Update the connected accounts index
      await this.addToConnectedAccountsIndex(signerId, platform, userId);
    } catch (error) {
      console.error('Error storing token:', error);
      throw new Error('Failed to store token');
    }
  }

  /**
   * Get a token for a NEAR account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   * @returns Token or null if not found
   */
  async getToken(signerId: string, platform: PlatformName, userId: string): Promise<any | null> {
    try {
      const key = ['token', signerId, platform, userId];
      return await this.kvStore.get(key);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  /**
   * Delete a token for a NEAR account
   * @param signerId NEAR account ID
   * @param platform Platform name (e.g., Platform.TWITTER)
   * @param userId User ID on the platform
   */
  async deleteToken(signerId: string, platform: PlatformName, userId: string): Promise<void> {
    try {
      const key = ['token', signerId, platform, userId];
      await this.kvStore.delete(key);

      // Update the connected accounts index
      await this.removeFromConnectedAccountsIndex(signerId, platform, userId);
    } catch (error) {
      console.error('Error deleting token:', error);
      throw new Error('Failed to delete token');
    }
  }

  /**
   * List all connected accounts for a NEAR wallet
   * @param signerId NEAR account ID
   * @returns Array of platform and userId pairs
   */
  async listConnectedAccounts(
    signerId: string,
  ): Promise<Array<{ platform: PlatformName; userId: string }>> {
    try {
      const indexKey = ['index', signerId];
      const accounts = await this.kvStore.get<Array<{ platform: PlatformName; userId: string }>>(
        indexKey,
      );

      // Convert platform strings to PlatformName
      const typedAccounts = (accounts || []).map((account) => ({
        platform: account.platform as PlatformName,
        userId: account.userId,
      }));

      return typedAccounts;
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
  async addToConnectedAccountsIndex(
    signerId: string,
    platform: PlatformName,
    userId: string,
  ): Promise<void> {
    try {
      const indexKey = ['index', signerId];
      const accounts =
        await this.kvStore.get<Array<{ platform: PlatformName; userId: string }>>(indexKey) || [];

      // Check if the account is already in the index
      const exists = accounts.some((acc) => acc.platform === platform && acc.userId === userId);

      if (!exists) {
        accounts.push({ platform, userId });
        await this.kvStore.set(indexKey, accounts);
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
  async removeFromConnectedAccountsIndex(
    signerId: string,
    platform: PlatformName,
    userId: string,
  ): Promise<void> {
    try {
      const indexKey = ['index', signerId];
      const accounts = await this.kvStore.get<Array<{ platform: PlatformName; userId: string }>>(
        indexKey,
      );

      if (!accounts) {
        return;
      }

      // Filter out the account to remove
      const updatedAccounts = accounts.filter(
        (acc) => !(acc.platform === platform && acc.userId === userId),
      );

      await this.kvStore.set(indexKey, updatedAccounts);
    } catch (error) {
      console.error('Error removing from connected accounts index:', error);
      throw new Error('Failed to update connected accounts index');
    }
  }

  /**
   * Authorize a NEAR account by validating its signature and storing authorization status.
   * @param signerId The NEAR account ID to authorize.
   * @returns Result indicating success or failure.
   */
  async authorizeNearAccount(
    signerId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const key = [signerId];
      const value = { authorized: true, timestamp: new Date().toISOString() };
      await this.kvStore.set(key, value);

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
      const result = await this.kvStore.get<{ authorized: boolean }>(key);

      return result?.authorized === true;
    } catch (error) {
      console.error(`Error checking authorization for NEAR account ${signerId}:`, error);
      return false; // Assume not authorized if there's an error
    }
  }

  /**
   * Unauthorize a NEAR account by validating its signature and removing the authorization status.
   * @param signerId The NEAR account ID to unauthorize.
   * @returns Result indicating success or failure.
   */
  async unauthorizeNearAccount(
    signerId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const key = [signerId];
      // Check if the key exists before attempting deletion
      const existing = await this.kvStore.get(key);
      if (existing === null) {
        console.log(`NEAR account ${signerId} was already not authorized.`);
        // Consider it a success if the goal state (unauthorized) is already met
        return { success: true };
      }

      await this.kvStore.delete(key);

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
}
