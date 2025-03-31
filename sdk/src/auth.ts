/**
 * Authentication utilities for the Crosspost SDK
 */

/**
 * NEAR authentication data interface
 */
export interface NearAuthData {
  /**
   * NEAR account ID
   */
  account_id: string;

  /**
   * Public key used for signing
   */
  public_key: string;

  /**
   * Signature of the message
   */
  signature: string;

  /**
   * Message that was signed
   */
  message: string;

  /**
   * Nonce used for signing
   */
  nonce: string;

  /**
   * Recipient of the message
   */
  recipient?: string;

  /**
   * Callback URL
   */
  callback_url?: string;
}

/**
 * Get the current authentication data
 * This is a placeholder function that should be implemented by the application
 * @returns The current authentication data or null if not authenticated
 */
export function getCurrentAuthData(): NearAuthData | null {
  // This is a placeholder function that should be implemented by the application
  // In a real implementation, this would retrieve the authentication data from storage
  return null;
}

/**
 * Format authentication data for use in headers
 * @param authData The authentication data to format
 * @returns The formatted authentication data as a string
 */
export function formatAuthData(authData: NearAuthData): string {
  return JSON.stringify(authData);
}

/**
 * Create authentication headers
 * @param authData The authentication data to use
 * @returns Headers object with Authorization header if authenticated
 */
export function createAuthHeaders(authData?: NearAuthData | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (authData) {
    headers['Authorization'] = `Bearer ${formatAuthData(authData)}`;
  }
  
  return headers;
}
