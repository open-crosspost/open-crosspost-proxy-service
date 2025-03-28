/**
 * NEAR Authentication Types
 * Defines types for NEAR authentication data
 */

/**
 * NEAR Authentication Data
 * Contains the data needed for NEAR authentication
 */
export interface NearAuthData {
  /**
   * NEAR account ID
   */
  accountId: string;
  
  /**
   * Public key used for signing
   */
  publicKey: string;
  
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
  callbackUrl?: string;
  
  /**
   * Scopes granted to the authentication
   */
  scopes?: string[];
}

/**
 * NEAR Authentication Payload
 * Represents the payload that was signed
 */
export interface NearAuthPayload {
  /**
   * Message that was signed
   */
  message: string;
  
  /**
   * Nonce used for signing
   */
  nonce: Uint8Array;
  
  /**
   * Recipient of the message
   */
  receiver: string;
  
  /**
   * Callback URL
   */
  callback_url?: string;
}

/**
 * NEAR Authentication Result
 * Result of NEAR authentication validation
 */
export interface NearAuthResult {
  /**
   * Whether the authentication is valid
   */
  valid: boolean;
  
  /**
   * NEAR account ID if valid
   */
  accountId?: string;
  
  /**
   * Error message if invalid
   */
  error?: string;
}

/**
 * NEAR Authentication Headers
 * Headers used for NEAR authentication
 */
export const NEAR_AUTH_HEADERS = {
  ACCOUNT_ID: 'X-Near-Account-Id',
  PUBLIC_KEY: 'X-Near-Public-Key',
  SIGNATURE: 'X-Near-Signature',
  MESSAGE: 'X-Near-Message',
  NONCE: 'X-Near-Nonce',
};
