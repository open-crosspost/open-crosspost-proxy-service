/**
 * Token Type enum
 */
export enum TokenType {
  OAUTH1 = "oauth1",
  OAUTH2 = "oauth2",
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

import { TokenAccessLogger, TokenOperation } from "../security/token-access-logger.ts";
import { Env } from "../../config/env.ts";

/**
 * Token Storage using Deno KV
 * Handles secure storage and retrieval of OAuth tokens
 */
export class TokenStorage {
  private kv: Deno.Kv | null = null;
  private encryptionKey: string;
  private logger: TokenAccessLogger;
  
  // Version constants for encryption
  private readonly ENCRYPTION_VERSION_1 = 0x01;
  private readonly CURRENT_ENCRYPTION_VERSION = this.ENCRYPTION_VERSION_1;
  
  constructor(encryptionKey: string, env: Env) {
    this.encryptionKey = encryptionKey;
    this.logger = new TokenAccessLogger(env);
  }
  
  /**
   * Initialize the KV store
   */
  async initialize(): Promise<void> {
    if (!this.kv) {
      this.kv = await Deno.openKv();
    }
  }
  
  /**
   * Get tokens for a user
   * @param userId The user ID to get tokens for
   * @returns The user's tokens
   * @throws Error if tokens are not found
   */
  async getTokens(userId: string): Promise<TwitterTokens> {
    try {
      await this.initialize();
      
      if (!this.kv) {
        throw new Error("KV store not initialized");
      }
      
      // Get the encrypted tokens from KV
      const key = ["tokens", userId];
      const result = await this.kv.get<string>(key);
      
      if (!result.value) {
        await this.logger.logAccess(TokenOperation.GET, userId, false, "Tokens not found");
        throw new Error("Tokens not found");
      }
      
      // Decrypt the tokens
      const tokens = await this.decryptTokens(result.value);
      
      // Log successful access
      await this.logger.logAccess(TokenOperation.GET, userId, true);
      
      return tokens;
    } catch (error) {
      // Log failed access
      await this.logger.logAccess(
        TokenOperation.GET, 
        userId, 
        false, 
        error instanceof Error ? error.message : "Unknown error"
      );
      console.error("Error getting tokens:", error);
      throw new Error("Failed to retrieve tokens");
    }
  }
  
  /**
   * Save tokens for a user
   * @param userId The user ID to save tokens for
   * @param tokens The tokens to save
   */
  async saveTokens(userId: string, tokens: TwitterTokens): Promise<void> {
    try {
      await this.initialize();
      
      if (!this.kv) {
        throw new Error("KV store not initialized");
      }
      
      // Encrypt the tokens
      const encryptedTokens = await this.encryptTokens(tokens);
      
      // Save the encrypted tokens to KV
      const key = ["tokens", userId];
      const result = await this.kv.set(key, encryptedTokens);
      
      if (!result.ok) {
        await this.logger.logAccess(TokenOperation.SAVE, userId, false, "Failed to save tokens");
        throw new Error(`Failed to save tokens for user ${userId}`);
      }
      
      // Log successful save
      await this.logger.logAccess(TokenOperation.SAVE, userId, true);
    } catch (error) {
      // Log failed save
      await this.logger.logAccess(
        TokenOperation.SAVE, 
        userId, 
        false, 
        error instanceof Error ? error.message : "Unknown error"
      );
      console.error("Error saving tokens:", error);
      throw new Error("Failed to save tokens");
    }
  }
  
  /**
   * Delete tokens for a user
   * @param userId The user ID to delete tokens for
   */
  async deleteTokens(userId: string): Promise<void> {
    try {
      await this.initialize();
      
      if (!this.kv) {
        throw new Error("KV store not initialized");
      }
      
      // Delete the tokens from KV
      const key = ["tokens", userId];
      await this.kv.delete(key);
      
      // Log successful deletion
      await this.logger.logAccess(TokenOperation.DELETE, userId, true);
    } catch (error) {
      // Log failed deletion
      await this.logger.logAccess(
        TokenOperation.DELETE, 
        userId, 
        false, 
        error instanceof Error ? error.message : "Unknown error"
      );
      console.error("Error deleting tokens:", error);
      throw new Error("Failed to delete tokens");
    }
  }
  
  /**
   * Check if tokens exist for a user
   * @param userId The user ID to check
   * @returns True if tokens exist
   */
  async hasTokens(userId: string): Promise<boolean> {
    try {
      await this.initialize();
      
      if (!this.kv) {
        throw new Error("KV store not initialized");
      }
      
      // Check if tokens exist in KV
      const key = ["tokens", userId];
      const result = await this.kv.get(key);
      const exists = result.value !== null;
      
      // Log check operation
      await this.logger.logAccess(TokenOperation.CHECK, userId, true);
      
      return exists;
    } catch (error) {
      // Log failed check
      await this.logger.logAccess(
        TokenOperation.CHECK, 
        userId, 
        false, 
        error instanceof Error ? error.message : "Unknown error"
      );
      console.error("Error checking tokens:", error);
      return false;
    }
  }
  
  /**
   * Close the KV store
   */
  async close(): Promise<void> {
    // Deno KV doesn't require explicit closing
  }
  
  /**
   * Encrypt tokens
   * @param tokens The tokens to encrypt
   * @returns The encrypted tokens
   */
  private async encryptTokens(tokens: TwitterTokens): Promise<string> {
    try {
      // Get the encryption key bytes
      const rawKeyData = new TextEncoder().encode(this.encryptionKey);
      
      // Normalize the key to a valid AES-GCM size (16, 24, or 32 bytes)
      // We'll use a cryptographic hash to derive a key of the right size
      let keyData: Uint8Array;
      
      if (rawKeyData.length === 16 || rawKeyData.length === 24 || rawKeyData.length === 32) {
        // Key is already a valid size, use it directly
        keyData = rawKeyData;
      } else {
        // Use SHA-256 to derive a 32-byte key
        const hashBuffer = await crypto.subtle.digest('SHA-256', rawKeyData);
        keyData = new Uint8Array(hashBuffer);
      }
      
      // Convert the encryption key to a CryptoKey
      const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
      );
      
      // Generate a random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Convert tokens to string
      const tokenString = JSON.stringify(tokens);
      const tokenData = new TextEncoder().encode(tokenString);
      
      // Encrypt the tokens
      const encryptedData = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        tokenData
      );
      
      // Create result with version byte + IV + encrypted data
      const result = new Uint8Array(1 + iv.length + encryptedData.byteLength);
      result[0] = this.CURRENT_ENCRYPTION_VERSION; // Version byte
      result.set(iv, 1);
      result.set(new Uint8Array(encryptedData), 1 + iv.length);
      
      // Return as base64 string
      return btoa(String.fromCharCode(...result));
    } catch (error) {
      console.error("Error encrypting tokens:", error);
      throw new Error("Failed to encrypt tokens");
    }
  }
  
  /**
   * Decrypt tokens
   * @param encryptedTokens The encrypted tokens
   * @returns The decrypted tokens
   */
  private async decryptTokens(encryptedTokens: string): Promise<TwitterTokens> {
    try {
      // Get the encryption key bytes
      const rawKeyData = new TextEncoder().encode(this.encryptionKey);
      
      // Normalize the key to a valid AES-GCM size (16, 24, or 32 bytes)
      // We'll use a cryptographic hash to derive a key of the right size
      let keyData: Uint8Array;
      
      if (rawKeyData.length === 16 || rawKeyData.length === 24 || rawKeyData.length === 32) {
        // Key is already a valid size, use it directly
        keyData = rawKeyData;
      } else {
        // Use SHA-256 to derive a 32-byte key
        const hashBuffer = await crypto.subtle.digest('SHA-256', rawKeyData);
        keyData = new Uint8Array(hashBuffer);
      }
      
      // Convert the encryption key to a CryptoKey
      const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );
      
      // Convert base64 to Uint8Array
      const data = Uint8Array.from(atob(encryptedTokens), (c) => c.charCodeAt(0));
      
      // Check if the data has a version byte
      if (data.length > 0) {
        const version = data[0];
        
        // Handle different versions
        if (version === this.ENCRYPTION_VERSION_1) {
          // Version 1: version byte + 12-byte IV + encrypted data
          const iv = data.slice(1, 13);
          const encryptedData = data.slice(13);
          
          // Decrypt the tokens
          const decryptedData = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            encryptedData
          );
          
          // Convert to string and parse JSON
          const tokenString = new TextDecoder().decode(decryptedData);
          return JSON.parse(tokenString);
        } else {
          // Legacy format (no version byte): IV + encrypted data
          // This handles tokens encrypted with the old format
          const iv = data.slice(0, 12);
          const encryptedData = data.slice(12);
          
          // Decrypt the tokens
          const decryptedData = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            encryptedData
          );
          
          // Convert to string and parse JSON
          const tokenString = new TextDecoder().decode(decryptedData);
          return JSON.parse(tokenString);
        }
      } else {
        throw new Error("Invalid encrypted data format");
      }
    } catch (error) {
      console.error("Error decrypting tokens:", error);
      throw new Error("Failed to decrypt tokens");
    }
  }
}
