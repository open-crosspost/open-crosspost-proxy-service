import { z } from 'zod';
import { PlatformSchema } from './common.ts';

export const PlatformParamSchema = z.object({
  platform: z.string().describe('Social media platform'),
}).describe('Platform parameter');

export const AuthInitRequestSchema = z.object({
  successUrl: z.string().url().optional().describe(
    'URL to redirect to on successful authentication',
  ),
  errorUrl: z.string().url().optional().describe('URL to redirect to on authentication error'),
}).describe('Auth initialization request');

export const AuthUrlResponseSchema = z.object({
  url: z.string().describe('Authentication URL to redirect the user to'),
  state: z.string().describe('State parameter for CSRF protection'),
  platform: PlatformSchema,
}).describe('Auth URL response');

export const AuthCallbackQuerySchema = z.object({
  code: z.string().describe('Authorization code from OAuth provider'),
  state: z.string().describe('State parameter for CSRF protection'),
}).describe('Auth callback query');

export const AuthCallbackResponseSchema = z.object({
  platform: PlatformSchema,
  userId: z.string().describe('User ID'),
  redirectUrl: z.string().optional().describe('URL to redirect the user to after authentication'),
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
  platform: PlatformSchema,
  userId: z.string().describe('User ID'),
}).describe('Auth revoke response');

export const ConnectedAccountSchema = z.object({
  platform: PlatformSchema,
  userId: z.string().describe('User ID on the platform'),
  username: z.string().optional().describe('Username on the platform (if available)'),
  profileUrl: z.string().optional().describe('URL to the user profile'),
  connectedAt: z.string().optional().describe('When the account was connected'),
}).describe('Connected account');

export const ConnectedAccountsResponseSchema = z.array(ConnectedAccountSchema).describe(
  'Connected accounts response',
);

export const NearAuthorizationRequestSchema = z.object({
  // No additional parameters needed, as the NEAR account ID is extracted from the signature
}).describe('NEAR authorization request');

export const NearAuthorizationResponseSchema = z.object({
  nearAccount: z.string().describe('NEAR account ID'),
  authorized: z.boolean().describe('Whether the account is authorized'),
}).describe('NEAR authorization response');

export const NearAuthorizationStatusResponseSchema = z.object({
  nearAccount: z.string().describe('NEAR account ID'),
  authorized: z.boolean().describe('Whether the account is authorized'),
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
