import { z } from 'zod';
import { PlatformSchema } from './common.ts';
import { UserProfileSchema } from './user-profile.ts';

export const PlatformParamSchema = z.object({
  platform: z.string().describe('Social media platform'),
}).describe('Platform parameter');

export const AuthStatusSchema = z.object({
  message: z.string().describe('User-friendly status message'),
  code: z.string().describe('Status code for programmatic handling'),
  details: z.string().optional().describe('Additional status details'),
}).describe('Authentication status information');

export const AuthInitRequestSchema = z.object({
  successUrl: z.string().url().optional().describe(
    'URL to redirect to on successful authentication',
  ),
  errorUrl: z.string().url().optional().describe('URL to redirect to on authentication error'),
  redirect: z.boolean().optional().default(false).describe(
    'Whether to redirect to successUrl/errorUrl (true) or return data directly (false)',
  ),
}).describe('Auth initialization request');

export const AuthUrlResponseSchema = z.object({
  url: z.string().describe('Authentication URL to redirect the user to'),
}).describe('Auth URL response');

export const AuthCallbackQuerySchema = z.object({
  code: z.string().describe('Authorization code from OAuth provider'),
  state: z.string().describe('State parameter for CSRF protection'),
}).describe('Auth callback query');

export const AuthCallbackResponseSchema = z.object({
  platform: PlatformSchema.optional(),
  userId: z.string().optional().describe('User ID, if authentication was successful for a user'),
  redirectUrl: z.string().optional().describe('URL to redirect the user to after authentication'),
  status: AuthStatusSchema.describe('Authentication status information'),
  success: z.boolean(),
  error: z.string().optional().describe('Error message description if success is false'),
}).describe('Auth callback response');

export const AuthStatusParamsSchema = z.object({
  platform: z.string().describe('Social media platform'),
  userId: z.string().describe('User ID on the platform'),
}).describe('Token status parameters');

export const NearUnauthorizationResponseSchema = z.object({
  success: z.boolean().describe('Whether the unauthorized operation was successful'),
  nearAccount: z.string().describe('NEAR account ID that was unauthorized'),
}).describe('NEAR unauthorized response');

export const AuthStatusResponseSchema = z.object({
  platform: PlatformSchema,
  userId: z.string().describe('User ID'),
  authenticated: z.boolean().describe('Whether the user is authenticated'),
  tokenStatus: z.object({
    valid: z.boolean().describe('Whether the token is valid'),
    expired: z.boolean().describe('Whether the token is expired'),
    expiresAt: z.string().optional().describe('When the token expires'),
  }),
}).describe('Auth status response');

export const AuthTokenRequestSchema = z.object({
  userId: z.string().describe('User ID on the platform'),
}).describe('Auth token request');

export const AuthRevokeResponseSchema = z.object({
  success: z.boolean().describe('Whether the revoke operation was successful'),
  userId: z.string().describe('User ID successfully revoked'),
  platform: z.string().describe('Platform successfully revoked')
}).describe('Auth revoke response');

export const ConnectedAccountSchema = z.object({
  platform: PlatformSchema,
  userId: z.string().describe('User ID on the platform'),
  connectedAt: z.string().describe('When the account was connected'),
  profile: UserProfileSchema.nullable().describe('Full user profile data'),
}).describe('Connected account');

export const ConnectedAccountsResponseSchema = z.object({
  accounts: z.array(ConnectedAccountSchema),
}).describe('Response containing an array of connected accounts');

export const NearAuthorizationRequestSchema = z.object({
  // No additional parameters needed, as the NEAR account ID is extracted from the signature
}).describe('NEAR authorization request');

export const NearAuthorizationResponseSchema = z.object({
  signerId: z.string().describe('NEAR account ID'),
  isAuthorized: z.boolean().describe('Whether the account is authorized'),
}).describe('NEAR authorization response');

export const NearAuthorizationStatusResponseSchema = z.object({
  signerId: z.string().describe('NEAR account ID'),
  isAuthorized: z.boolean().describe('Whether the account is authorized'),
  authorizedAt: z.string().optional().describe('When the account was authorized'),
}).describe('NEAR authorization status response');

export type PlatformParam = z.infer<typeof PlatformParamSchema>;
export type AuthInitRequest = z.infer<typeof AuthInitRequestSchema>;
export type AuthUrlResponse = z.infer<typeof AuthUrlResponseSchema>;
export type AuthCallbackQuery = z.infer<typeof AuthCallbackQuerySchema>;
export type AuthCallbackResponse = z.infer<typeof AuthCallbackResponseSchema>;
export type AuthStatusResponse = z.infer<typeof AuthStatusResponseSchema>;
export type AuthRevokeResponse = z.infer<typeof AuthRevokeResponseSchema>;
export type ConnectedAccount = z.infer<typeof ConnectedAccountSchema>;
export type ConnectedAccountsResponse = z.infer<typeof ConnectedAccountsResponseSchema>;
export type NearAuthorizationRequest = z.infer<typeof NearAuthorizationRequestSchema>;
export type NearAuthorizationResponse = z.infer<typeof NearAuthorizationResponseSchema>;
export type NearAuthorizationStatusResponse = z.infer<typeof NearAuthorizationStatusResponseSchema>;
export type AuthTokenRequest = z.infer<typeof AuthTokenRequestSchema>;
export type AuthStatusParams = z.infer<typeof AuthStatusParamsSchema>;
export type NearUnauthorizationResponse = z.infer<typeof NearUnauthorizationResponseSchema>;
export type AuthStatus = z.infer<typeof AuthStatusSchema>;
