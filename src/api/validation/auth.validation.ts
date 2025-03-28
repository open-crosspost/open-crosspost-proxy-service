import { z } from 'zod';
import { DEFAULT_CONFIG } from '../../config';

/**
 * Auth Validation Schemas
 * Defines validation schemas for auth-related requests
 */

/**
 * Initialize Auth Schema
 * Validates the request to initialize the authentication process
 */
export const InitializeAuthSchema = z.object({
  redirectUri: z.string().url('Invalid redirect URI'),
  scopes: z.array(z.string()).optional().default(DEFAULT_CONFIG.AUTH.DEFAULT_SCOPES),
  state: z.string().optional(),
});

/**
 * Auth Callback Schema
 * Validates the request to handle the OAuth callback
 */
export const AuthCallbackSchema = z.object({
  code: z.string({
    required_error: 'Authorization code is required',
  }),
  state: z.string({
    required_error: 'State parameter is required',
  }),
  savedState: z.string({
    required_error: 'Saved state is required',
  }),
  redirectUri: z.string().url('Invalid redirect URI'),
  codeVerifier: z.string().optional(),
});

/**
 * Refresh Token Schema
 * Validates the request to refresh a token
 */
export const RefreshTokenSchema = z.object({
  userId: z.string({
    required_error: 'User ID is required',
  }),
});

/**
 * Revoke Token Schema
 * Validates the request to revoke a token
 */
export const RevokeTokenSchema = z.object({
  userId: z.string({
    required_error: 'User ID is required',
  }),
});

/**
 * Has Valid Tokens Schema
 * Validates the request to check if a user has valid tokens
 */
export const HasValidTokensSchema = z.object({
  userId: z.string({
    required_error: 'User ID is required',
  }),
});
