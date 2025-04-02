/**
 * NEAR authentication provider for the Crosspost SDK
 */

import { NearSigner } from '@crosspost/near-simple-signing';
import { CrosspostError } from '../errors/index.js';
import { AuthProvider } from './auth-provider.js';

/**
 * NEAR authentication provider
 * Implements the AuthProvider interface using NEAR wallet signatures
 */
export class NearAuthProvider implements AuthProvider {
  /**
   * NEAR signer
   */
  private readonly signer: NearSigner;

  /**
   * Constructor
   * @param signer NEAR signer
   */
  constructor(signer: NearSigner) {
    this.signer = signer;
  }

  /**
   * Get authentication headers for a request
   * @param message Optional message to sign (defaults to current timestamp)
   * @returns Authentication headers
   */
  async getAuthHeaders(message?: string): Promise<Record<string, string>> {
    try {
      // If no message is provided, use the current timestamp
      const messageToSign = message || new Date().toISOString();

      // Create an authentication header using the NEAR signer
      const authHeader = await this.signer.createAuthHeader(messageToSign);

      // Return the headers
      return {
        'Authorization': `Bearer ${authHeader}`,
      };
    } catch (error) {
      throw CrosspostError.authentication(
        'Failed to create NEAR authentication headers',
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Get the user ID associated with this auth provider
   * @returns User ID or null if not available
   */
  async getUserId(): Promise<string | null> {
    const account = this.signer.getAccount();
    return account ? account.accountId : null;
  }

  /**
   * Check if the auth provider is authenticated
   * @returns True if authenticated, false otherwise
   */
  async isAuthenticated(): Promise<boolean> {
    return this.signer.getAccount() !== null;
  }

  /**
   * Get the authentication type
   * @returns Authentication type
   */
  getAuthType(): 'near' | 'apiKey' {
    return 'near';
  }
}
