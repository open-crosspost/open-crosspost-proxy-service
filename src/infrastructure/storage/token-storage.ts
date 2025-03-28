import { Env } from '../../config/env';

/**
 * Token Type enum
 */
export enum TokenType {
  OAUTH1 = 'oauth1',
  OAUTH2 = 'oauth2',
}

/**
 * Twitter Tokens interface
 */
export interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
  tokenSecret?: string;
  expiresAt?: number;
  scope?: string | string[];
  tokenType: TokenType | string;
}

/**
 * Token Storage
 * Handles secure storage and retrieval of OAuth tokens
 */
export class TokenStorage {
  private env: Env;
  
  constructor(env: Env) {
    this.env = env;
  }
  
  /**
   * Get tokens for a user
   * @param userId The user ID to get tokens for
   * @returns The user's tokens
   * @throws Error if tokens are not found
   */
  async getTokens(userId: string): Promise<TwitterTokens> {
    try {
      // Get the encrypted tokens from KV
      const encryptedTokens = await this.env.TOKENS.get(userId);
      
      if (!encryptedTokens) {
        throw new Error('Tokens not found');
      }
      
      // Decrypt the tokens
      const tokens = this.decryptTokens(encryptedTokens);
      
      return tokens;
    } catch (error) {
      console.error('Error getting tokens:', error);
      throw new Error('Failed to retrieve tokens');
    }
  }
  
  /**
   * Save tokens for a user
   * @param userId The user ID to save tokens for
   * @param tokens The tokens to save
   */
  async saveTokens(userId: string, tokens: TwitterTokens): Promise<void> {
    try {
      // Encrypt the tokens
      const encryptedTokens = this.encryptTokens(tokens);
      
      // Save the encrypted tokens to KV
      await this.env.TOKENS.put(userId, encryptedTokens);
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw new Error('Failed to save tokens');
    }
  }
  
  /**
   * Delete tokens for a user
   * @param userId The user ID to delete tokens for
   */
  async deleteTokens(userId: string): Promise<void> {
    try {
      // Delete the tokens from KV
      await this.env.TOKENS.delete(userId);
    } catch (error) {
      console.error('Error deleting tokens:', error);
      throw new Error('Failed to delete tokens');
    }
  }
  
  /**
   * Check if tokens exist for a user
   * @param userId The user ID to check
   * @returns True if tokens exist
   */
  async hasTokens(userId: string): Promise<boolean> {
    try {
      // Check if tokens exist in KV
      const tokens = await this.env.TOKENS.get(userId);
      return !!tokens;
    } catch (error) {
      console.error('Error checking tokens:', error);
      return false;
    }
  }
  
  /**
   * Encrypt tokens
   * @param tokens The tokens to encrypt
   * @returns The encrypted tokens
   */
  private encryptTokens(tokens: TwitterTokens): string {
    try {
      // In a real implementation, this would use a proper encryption library
      // For now, we'll just use a simple JSON.stringify with base64 encoding
      // This should be replaced with proper encryption using the ENCRYPTION_KEY
      
      const tokenString = JSON.stringify(tokens);
      return btoa(tokenString);
    } catch (error) {
      console.error('Error encrypting tokens:', error);
      throw new Error('Failed to encrypt tokens');
    }
  }
  
  /**
   * Decrypt tokens
   * @param encryptedTokens The encrypted tokens
   * @returns The decrypted tokens
   */
  private decryptTokens(encryptedTokens: string): TwitterTokens {
    try {
      // In a real implementation, this would use a proper encryption library
      // For now, we'll just use a simple JSON.parse with base64 decoding
      // This should be replaced with proper decryption using the ENCRYPTION_KEY
      
      const tokenString = atob(encryptedTokens);
      return JSON.parse(tokenString);
    } catch (error) {
      console.error('Error decrypting tokens:', error);
      throw new Error('Failed to decrypt tokens');
    }
  }
}
