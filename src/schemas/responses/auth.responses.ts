/**
 * Response schemas for authentication-related endpoints
 */

import { z } from 'zod';
import { enhancedResponseSchema } from '../zod/index.js';
import { platformSchema } from '../zod/common.schemas.js';

/**
 * Auth URL response schema
 */
export const authUrlResponseSchema = enhancedResponseSchema(
  z.object({
    url: z.string().describe('Authentication URL to redirect the user to'),
    state: z.string().describe('State parameter for CSRF protection'),
    platform: platformSchema,
  }),
);

/**
 * Auth callback response schema
 */
export const authCallbackResponseSchema = enhancedResponseSchema(
  z.object({
    success: z.boolean().describe('Whether the authentication was successful'),
    platform: platformSchema,
    userId: z.string().describe('User ID'),
    redirectUrl: z.string().optional().describe('URL to redirect the user to after authentication'),
  }),
);

/**
 * Auth status response schema
 */
export const authStatusResponseSchema = enhancedResponseSchema(
  z.object({
    platform: platformSchema,
    userId: z.string().describe('User ID'),
    authenticated: z.boolean().describe('Whether the user is authenticated'),
    tokenStatus: z.object({
      valid: z.boolean().describe('Whether the token is valid'),
      expired: z.boolean().describe('Whether the token is expired'),
      expiresAt: z.string().optional().describe('When the token expires'),
    }),
  }),
);

/**
 * Auth revoke response schema
 */
export const authRevokeResponseSchema = enhancedResponseSchema(
  z.object({
    success: z.boolean().describe('Whether the revocation was successful'),
    platform: platformSchema,
    userId: z.string().describe('User ID'),
  }),
);

/**
 * Connected accounts response schema
 */
export const connectedAccountsResponseSchema = enhancedResponseSchema(
  z.array(
    z.object({
      platform: platformSchema,
      userId: z.string().describe('User ID'),
      username: z.string().optional().describe('Username'),
      profileUrl: z.string().optional().describe('URL to the user profile'),
      connectedAt: z.string().optional().describe('When the account was connected'),
    }),
  ),
);

/**
 * NEAR authorization response schema
 */
export const nearAuthorizationResponseSchema = enhancedResponseSchema(
  z.object({
    success: z.boolean().describe('Whether the authorization was successful'),
    nearAccount: z.string().describe('NEAR account ID'),
    authorized: z.boolean().describe('Whether the account is authorized'),
  }),
);

/**
 * NEAR authorization status response schema
 */
export const nearAuthorizationStatusResponseSchema = enhancedResponseSchema(
  z.object({
    nearAccount: z.string().describe('NEAR account ID'),
    authorized: z.boolean().describe('Whether the account is authorized'),
    authorizedAt: z.string().optional().describe('When the account was authorized'),
  }),
);
