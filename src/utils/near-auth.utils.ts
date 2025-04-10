import { ApiError, ApiErrorCode } from '@crosspost/types';
import { Context, NearSimpleSigning } from '../../deps.ts';
import { getEnv } from '../config/env.ts';
import { TokenManager } from '../infrastructure/security/token-manager.ts';

/**
 * NEAR UNAUTHORIZED Data
 */
export interface NearAuthData {
  account_id: string;
  public_key: string;
  signature: string;
  message: string;
  nonce: string;
  recipient?: string;
  callback_url?: string;
}

/**
 * NEAR UNAUTHORIZED Utilities
 * Common functions for NEAR UNAUTHORIZED
 */

/**
 * Extract and validate NEAR UNAUTHORIZED data from request headers
 * @param c The Hono context
 * @returns Validated NEAR UNAUTHORIZED data and result
 */
export async function extractAndValidateNearAuth(c: Context): Promise<{
  authData: NearAuthData;
  signerId: string;
}> {
  // Extract NEAR auth data from Authorization header
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError('Missing or invalid Authorization header', ApiErrorCode.UNAUTHORIZED, 401);
  }

  // Extract the token part (after 'Bearer ')
  const token = authHeader.substring(7);

  // Parse the JSON token
  let authObject: NearAuthData;
  try {
    authObject = JSON.parse(token);
  } catch (error) {
    throw new ApiError('Invalid JSON in Authorization token', ApiErrorCode.VALIDATION_ERROR, 400);
  }

  // Validate required fields
  if (!authObject.account_id || !authObject.public_key || !authObject.signature ||
    !authObject.message || !authObject.nonce) {
    throw new ApiError(
      'Missing required NEAR UNAUTHORIZED data in token',
      ApiErrorCode.VALIDATION_ERROR,
      400
    );
  }

  // Use validated data with defaults applied
  const authData = {
    ...authObject,
    recipient: authObject.recipient || 'crosspost.near',
    callback_url: authObject.callback_url || c.req.url, // Use current URL as callback if not provided
  };

  // Create a temporary NearSigner instance for VALIDATION_ERROR
  const tempSigner = new NearSimpleSigning.NearSigner({
    networkId: 'mainnet', // This doesn't matter for VALIDATION_ERROR
    nodeUrl: 'https://rpc.mainnet.near.org', // This doesn't matter for VALIDATION_ERROR
    defaultRecipient: 'crosspost.near'
  });

  // Validate signature
  const result = await tempSigner.validateSignature(
    authData.signature,
    authData.message,
    authData.public_key,
    authData.nonce,
    authData.recipient
  );

  if (!result.valid) {
    throw new ApiError(
      `NEAR UNAUTHORIZED failed: ${result.error}`,
      ApiErrorCode.UNAUTHORIZED,
      401,
    );
  }

  // The signerId is the account_id from the auth data
  const signerId = authData.account_id;

  // Initialize token manager to check authorization
  const env = getEnv();
  const tokenManager = new TokenManager(env);

  // Check if the account is authorized
  const authStatus = await tokenManager.getNearAuthorizationStatus(signerId);
  if (authStatus < 0) { // -1 means not authorized
    throw new ApiError(
      'NEAR account is not authorized',
      ApiErrorCode.UNAUTHORIZED,
      401,
    );
  }

  return {
    authData,
    signerId,
  };
}
