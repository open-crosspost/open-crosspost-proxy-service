import { createAuthToken } from 'near-sign-verify';
import type { NearAuthData } from './types/auth';

/**
 * Generates a fresh authentication token for API requests
 * @param nearAuthData The NEAR authentication data
 * @returns A signed authentication token
 */
export function generateAuthToken(nearAuthData: NearAuthData): string {
  return createAuthToken(nearAuthData);
}

/**
 * Creates headers for API requests based on method and auth data
 * @param method HTTP method
 * @param nearAuthData NEAR authentication data
 * @returns Headers object for the request
 */
export function createAuthHeaders(
  method: string,
  nearAuthData: NearAuthData,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (method === 'GET') {
    // For GET requests, use X-Near-Account header
    headers['X-Near-Account'] = nearAuthData.account_id;
  } else {
    // For POST/PUT/DELETE requests, use Bearer token
    headers['Authorization'] = `Bearer ${generateAuthToken(nearAuthData)}`;
  }

  return headers;
}

/**
 * Validates NEAR authentication data
 * @param nearAuthData The authentication data to validate
 * @returns True if valid, false otherwise
 */
export function isValidNearAuthData(nearAuthData: NearAuthData): boolean {
  return !!(
    nearAuthData.account_id &&
    nearAuthData.public_key &&
    nearAuthData.signature &&
    nearAuthData.message &&
    Array.isArray(nearAuthData.nonce) &&
    nearAuthData.recipient
  );
}
