import { Env } from '../../../config/env';
import { NearAuthData, NearAuthPayload, NearAuthResult } from './near-auth.types';
import * as nacl from 'tweetnacl';
import * as base58js from 'base58-js';

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
      if (!authData.accountId || !authData.publicKey || !authData.signature || !authData.message || !authData.nonce) {
        return {
          valid: false,
          error: 'Missing required authentication data'
        };
      }
      
      // Create payload
      const payload: NearAuthPayload = {
        message: authData.message,
        nonce: this.stringToUint8Array(authData.nonce.padStart(32, '0')),
        receiver: authData.recipient || 'twitter-proxy.near',
        callback_url: authData.callbackUrl
      };
      
      // Validate signature
      const isValid = await this.validateSignature(
        authData.publicKey,
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
        accountId: authData.accountId
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
      // Serialize payload
      const serializedPayload = this.serializePayload(payload);
      
      // Hash the payload using Web Crypto API
      const encoder = new TextEncoder();
      const data = encoder.encode(serializedPayload.toString());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const payloadHash = new Uint8Array(hashBuffer);
      
      // Decode the signature
      const signatureBytes = this.base64ToUint8Array(signature);
      
      // Decode the public key (remove ed25519: prefix if present)
      const publicKeyString = publicKey.startsWith(this.ED25519_PREFIX)
        ? publicKey.substring(this.ED25519_PREFIX.length)
        : publicKey;
      
      // Use base58js to decode the public key
      const publicKeyBytes = base58js.base58_to_binary(publicKeyString);
      
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
   * Serialize a payload for signing
   * This is a simplified version - in production, you would use borsh serialization
   * @param payload Payload to serialize
   * @returns Serialized payload
   */
  private serializePayload(payload: NearAuthPayload): Uint8Array {
    // In a real implementation, you would use borsh serialization
    // For this example, we'll use a simplified approach
    
    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(payload.message);
    
    // Combine all parts
    const parts = [
      messageBytes,
      payload.nonce,
      new TextEncoder().encode(payload.receiver),
      payload.callback_url ? new TextEncoder().encode(payload.callback_url) : new Uint8Array(0)
    ];
    
    // Calculate total length
    const totalLength = parts.reduce((acc, part) => acc + part.length, 0);
    
    // Create result array
    const result = new Uint8Array(totalLength);
    
    // Copy parts to result
    let offset = 0;
    for (const part of parts) {
      result.set(part, offset);
      offset += part.length;
    }
    
    return result;
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
      const key = `${platform}:${accountId}:${userId}`;
      await this.env.TOKENS.delete(key);
    } catch (error) {
      console.error('Error deleting token:', error);
      throw new Error('Failed to delete token');
    }
  }
}
