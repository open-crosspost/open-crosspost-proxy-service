import { Context } from '../../deps.ts';
import { getEnv } from '../config/env.ts';
import { NearAuthService } from '../infrastructure/security/near-auth/near-auth.service.ts';
import {
  NearAuthData,
  nearAuthDataSchema,
} from '../infrastructure/security/near-auth/near-auth.types.ts';
import { ApiError, ErrorType } from '../middleware/errors.ts';
import { PlatformName } from '../types/platform.types.ts';

/**
 * NEAR Authentication Utilities
 * Common functions for NEAR authentication
 */

/**
 * Extract and validate NEAR authentication data from request headers
 * @param c The Hono context
 * @returns Validated NEAR authentication data and result
 */
export async function extractAndValidateNearAuth(c: Context): Promise<{
  authData: NearAuthData;
  signerId: string;
}> {
  // Extract NEAR auth data from Authorization header
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(ErrorType.AUTHENTICATION, 'Missing or invalid Authorization header', 401);
  }

  // Extract the token part (after 'Bearer ')
  const token = authHeader.substring(7);

  // Parse the JSON token
  let authObject: NearAuthData;
  try {
    authObject = JSON.parse(token);
  } catch (error) {
    throw new ApiError(ErrorType.VALIDATION, 'Invalid JSON in Authorization token', 400);
  }

  // Validate with Zod schema
  const validationResult = nearAuthDataSchema.safeParse(authObject);

  if (!validationResult.success) {
    throw new ApiError(
      ErrorType.VALIDATION,
      'Missing required NEAR authentication data in token',
      400,
      undefined,
      validationResult.error.format(),
    );
  }

  // Use validated data with defaults applied
  const authData = {
    ...validationResult.data,
    callback_url: validationResult.data.callback_url || c.req.url, // Use current URL as callback if not provided
  };

  // Initialize NEAR auth service
  const env = getEnv();
  const nearAuthService = new NearAuthService(env);

  // Validate signature
  const result = await nearAuthService.validateNearAuth(authData);

  if (!result.valid) {
    throw new ApiError(
      ErrorType.AUTHENTICATION,
      `NEAR authentication failed: ${result.error}`,
      401,
    );
  }

  // The signerId is only present if validation is successful
  const signerId = result.signerId;
  if (!signerId) {
    throw new ApiError(
      ErrorType.AUTHENTICATION,
      'NEAR authentication did not return an account ID',
      401,
    );
  }

  return {
    authData,
    signerId,
  };
}

/**
 * Verify that a NEAR account has a valid token for a platform and userId
 * @param signerId NEAR account ID
 * @param platform Platform name (e.g., Platform.TWITTER)
 * @param userId User ID on the platform
 * @returns The token if valid, throws an error if not
 */
export async function verifyPlatformAccess(
  signerId: string,
  platform: PlatformName,
  userId: string,
): Promise<any> {
  const env = getEnv();
  const nearAuthService = new NearAuthService(env);

  // Check if the NEAR account has a token for this platform and userId
  const token = await nearAuthService.getToken(signerId, platform, userId);

  if (!token) {
    throw new ApiError(
      ErrorType.AUTHENTICATION,
      `No connected ${platform} account found for user ID ${userId}`,
      401,
    );
  }

  return token;
}
