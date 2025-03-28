import { Env } from '../../../config/env.ts';
import { NearAuthData, NearAuthPayload, NearAuthResult, PAYLOAD_SCHEMA, nearAuthDataSchema } from './near-auth.types.ts';
import nacl from 'npm:tweetnacl';
import { base58_to_binary } from 'npm:base58-js';
import { BorshSchema } from 'npm:borsher';

/**
 * NEAR Authentication Service
 * Handles NEAR authentication validation
 */
export class NearAuthService {
  private readonly ED25519_PREFIX = 'ed25519:';
  
  constructor(private env: Env) {}
  
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
          error: `Missing required authentication data: ${JSON.stringify(validationResult.error.format())}`
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
        receiver: authData.recipient || 'crosspost.near'
      };
      
      // Validate signature
      const isValid = await this.validateSignature(
        authData.public_key,
        authData.signature,
        payload
      );
      
      if (!isValid) {
        return {
          valid: false,
          error: 'Invalid signature'
        };
      }
      
      return {
        valid: true,
        accountId: authData.account_id
      };
    } catch (error: unknown) {
      console.error('Error validating NEAR authentication:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error validating NEAR authentication';
      return {
        valid: false,
        error: errorMessage
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
  private async validateSignature(publicKey: string, signature: string, payload: NearAuthPayload): Promise<boolean> {
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
        publicKeyBytes
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
   * @param accountId NEAR account ID
   * @param platform Platform name (e.g., 'twitter')
   * @param userId User ID on the platform
   * @param token Token to store
   */
  async storeToken(accountId: string, platform: string, userId: string, token: any): Promise<void> {
    try {
      if (!this.env.TOKENS) {
        throw new Error('TOKENS binding not available');
      }
      const key = `${platform}:${accountId}:${userId}`;
      await this.env.TOKENS.put(key, JSON.stringify(token));
    } catch (error) {
      console.error('Error storing token:', error);
      throw new Error('Failed to store token');
    }
  }
  
  /**
   * Get a token for a NEAR account
   * @param accountId NEAR account ID
   * @param platform Platform name (e.g., 'twitter')
   * @param userId User ID on the platform
   * @returns Token or null if not found
   */
  async getToken(accountId: string, platform: string, userId: string): Promise<any | null> {
    try {
      if (!this.env.TOKENS) {
        throw new Error('TOKENS binding not available');
      }
      const key = `${platform}:${accountId}:${userId}`;
      const token = await this.env.TOKENS.get(key);
      
      if (!token) return null;
      
      return JSON.parse(token);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }
  
  /**
   * Delete a token for a NEAR account
   * @param accountId NEAR account ID
   * @param platform Platform name (e.g., 'twitter')
   * @param userId User ID on the platform
   */
  async deleteToken(accountId: string, platform: string, userId: string): Promise<void> {
    try {
      if (!this.env.TOKENS) {
        throw new Error('TOKENS binding not available');
      }
      const key = `${platform}:${accountId}:${userId}`;
      await this.env.TOKENS.delete(key);
    } catch (error) {
      console.error('Error deleting token:', error);
      throw new Error('Failed to delete token');
    }
  }
}
