// Example of using Deno KV for token storage
// Run with: deno run --allow-net --allow-env --allow-read --allow-write token-storage.ts

// Define token types (similar to your existing code)
export enum TokenType {
  OAUTH2 = 'oauth2',
  OAUTH1 = 'oauth1',
}

// Define token interface
export interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string[];
  tokenType: TokenType;
}

/**
 * Token Storage using Deno KV
 * This is a simplified version of your existing TokenStorage class
 */
export class TokenStorage {
  private kv: Deno.Kv;
  private encryptionKey: string;
  
  constructor(encryptionKey: string) {
    this.encryptionKey = encryptionKey;
  }
  
  /**
   * Initialize the KV store
   */
  async initialize(): Promise<void> {
    this.kv = await Deno.openKv();
    console.log("Deno KV initialized");
  }
  
  /**
   * Save tokens for a user
   * @param userId The user ID
   * @param tokens The tokens to save
   */
  async saveTokens(userId: string, tokens: TwitterTokens): Promise<void> {
    if (!this.kv) {
      await this.initialize();
    }
    
    // In a real implementation, encrypt the tokens before storing
    // For this example, we'll just store them directly
    const key = ["tokens", userId];
    const result = await this.kv.set(key, tokens);
    
    if (!result.ok) {
      throw new Error(`Failed to save tokens for user ${userId}`);
    }
    
    console.log(`Tokens saved for user ${userId}`);
  }
  
  /**
   * Get tokens for a user
   * @param userId The user ID
   * @returns The tokens
   */
  async getTokens(userId: string): Promise<TwitterTokens> {
    if (!this.kv) {
      await this.initialize();
    }
    
    const key = ["tokens", userId];
    const result = await this.kv.get<TwitterTokens>(key);
    
    if (!result.value) {
      throw new Error(`No tokens found for user ${userId}`);
    }
    
    // In a real implementation, decrypt the tokens before returning
    return result.value;
  }
  
  /**
   * Delete tokens for a user
   * @param userId The user ID
   */
  async deleteTokens(userId: string): Promise<void> {
    if (!this.kv) {
      await this.initialize();
    }
    
    const key = ["tokens", userId];
    await this.kv.delete(key);
    console.log(`Tokens deleted for user ${userId}`);
  }
  
  /**
   * Close the KV store
   */
  async close(): Promise<void> {
    // Deno KV doesn't require explicit closing
  }
}

// Example usage
async function main() {
  // Create a token storage instance
  const tokenStorage = new TokenStorage("dummy-encryption-key");
  await tokenStorage.initialize();
  
  // Example user ID
  const userId = "123456789";
  
  // Example tokens
  const tokens: TwitterTokens = {
    accessToken: "example-access-token",
    refreshToken: "example-refresh-token",
    expiresAt: Date.now() + 3600 * 1000,
    scope: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    tokenType: TokenType.OAUTH2,
  };
  
  try {
    // Save tokens
    console.log("Saving tokens...");
    await tokenStorage.saveTokens(userId, tokens);
    
    // Get tokens
    console.log("Getting tokens...");
    const retrievedTokens = await tokenStorage.getTokens(userId);
    console.log("Retrieved tokens:", retrievedTokens);
    
    // Delete tokens
    console.log("Deleting tokens...");
    await tokenStorage.deleteTokens(userId);
    
    // Try to get deleted tokens (should throw an error)
    try {
      console.log("Trying to get deleted tokens...");
      await tokenStorage.getTokens(userId);
    } catch (error) {
      console.log("Expected error:", error.message);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the example
main();
