/**
 * Authentication provider interface for the Crosspost SDK
 */

/**
 * Authentication provider interface
 * Defines the contract for authentication providers
 */
export interface AuthProvider {
  /**
   * Get authentication headers for a request
   * @param message Optional message to sign (for NEAR auth)
   * @returns Authentication headers
   */
  getAuthHeaders(message?: string): Promise<Record<string, string>>;

  /**
   * Get the user ID associated with this auth provider
   * @returns User ID or null if not available
   */
  getUserId(): Promise<string | null>;

  /**
   * Check if the auth provider is authenticated
   * @returns True if authenticated, false otherwise
   */
  isAuthenticated(): Promise<boolean>;

  /**
   * Get the authentication type
   * @returns Authentication type
   */
  getAuthType(): 'near' | 'apiKey';
}
