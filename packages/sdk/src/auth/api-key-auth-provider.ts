/**
 * API key authentication provider for the Crosspost SDK
 */

import { AuthProvider } from './auth-provider.js';

/**
 * API key authentication provider
 * Implements the AuthProvider interface using API keys
 */
export class ApiKeyAuthProvider implements AuthProvider {
  /**
   * API key
   */
  private readonly apiKey: string;

  /**
   * Constructor
   * @param apiKey API key
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get authentication headers for a request
   * @returns Authentication headers
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    return {
      'X-API-Key': this.apiKey,
    };
  }

  /**
   * Get the user ID associated with this auth provider
   * @returns User ID or null if not available
   */
  async getUserId(): Promise<string | null> {
    // API key auth doesn't have a user ID
    return null;
  }

  /**
   * Check if the auth provider is authenticated
   * @returns True if authenticated, false otherwise
   */
  async isAuthenticated(): Promise<boolean> {
    // API key auth is always authenticated if the key is provided
    return Boolean(this.apiKey);
  }

  /**
   * Get the authentication type
   * @returns Authentication type
   */
  getAuthType(): 'near' | 'apiKey' {
    return 'apiKey';
  }
}
