import { Env } from '../index';
import { Errors } from '../middleware/errors';
import * as jose from 'jose';

// Define token structure
export interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
  accessSecret?: string; // Kept for backward compatibility
  expiresAt: number; // Timestamp in milliseconds
  scope: string;
  tokenType: 'oauth2'; // Only OAuth 2.0 is supported
}

/**
 * Token Store Service
 * Handles secure storage and retrieval of OAuth tokens
 */
export class TokenStore {
  private env: Env;
  private encryptionKey: Uint8Array;

  constructor(env: Env) {
    this.env = env;
    
    // Convert the base64 encryption key to a Uint8Array
    this.encryptionKey = jose.base64url.decode(env.ENCRYPTION_KEY);
  }

  /**
   * Store tokens for a user
   */
  async saveTokens(userId: string, tokens: TwitterTokens): Promise<void> {
    try {
      // Encrypt the tokens
      const encryptedTokens = await this.encryptTokens(tokens);
      
      // Store the encrypted tokens in KV
      await this.env.TOKENS.put(`user:${userId}`, encryptedTokens);
    } catch (error: any) {
      console.error('Error saving tokens:', error);
      throw Errors.internal('Failed to save tokens');
    }
  }

  /**
   * Retrieve tokens for a user
   */
  async getTokens(userId: string): Promise<TwitterTokens> {
    try {
      // Get the encrypted tokens from KV
      const encryptedTokens = await this.env.TOKENS.get(`user:${userId}`);
      
      if (!encryptedTokens) {
        throw Errors.authentication('User not authenticated');
      }
      
      // Decrypt the tokens
      return await this.decryptTokens(encryptedTokens);
    } catch (error: any) {
      console.error('Error retrieving tokens:', error);
      
      if (error.name === 'ApiError') {
        throw error;
      }
      
      throw Errors.internal('Failed to retrieve tokens');
    }
  }

  /**
   * Delete tokens for a user
   */
  async deleteTokens(userId: string): Promise<void> {
    try {
      // Delete the tokens from KV
      await this.env.TOKENS.delete(`user:${userId}`);
    } catch (error: any) {
      console.error('Error deleting tokens:', error);
      throw Errors.internal('Failed to delete tokens');
    }
  }

  /**
   * Check if tokens are valid and not expired
   */
  isTokenValid(tokens: TwitterTokens): boolean {
    // Check if the tokens are about to expire (within 5 minutes)
    const now = Date.now();
    const expiresAt = tokens.expiresAt;
    const fiveMinutes = 5 * 60 * 1000;
    
    return expiresAt > now + fiveMinutes;
  }

  /**
   * Encrypt tokens using JWE
   */
  private async encryptTokens(tokens: TwitterTokens): Promise<string> {
    try {
      // Convert tokens to JSON string
      const tokenString = JSON.stringify(tokens);
      
      // Encrypt the tokens using JWE
      const jwe = await new jose.CompactEncrypt(
        new TextEncoder().encode(tokenString)
      )
        .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
        .encrypt(this.encryptionKey);
      
      return jwe;
    } catch (error: any) {
      console.error('Error encrypting tokens:', error);
      throw Errors.internal('Failed to encrypt tokens');
    }
  }

  /**
   * Decrypt tokens using JWE
   */
  private async decryptTokens(encryptedTokens: string): Promise<TwitterTokens> {
    try {
      // Decrypt the tokens using JWE
      const { plaintext } = await jose.compactDecrypt(
        encryptedTokens,
        this.encryptionKey
      );
      
      // Convert the plaintext to a string and parse as JSON
      const tokenString = new TextDecoder().decode(plaintext);
      return JSON.parse(tokenString) as TwitterTokens;
    } catch (error: any) {
      console.error('Error decrypting tokens:', error);
      throw Errors.internal('Failed to decrypt tokens');
    }
  }
}
