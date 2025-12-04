import { z } from 'every-plugin/zod';

/**
 * Base schema for all authenticated requests
 * Backend passes tokens to plugin operations
 */
export const AuthenticatedRequest = z.object({
  userId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number().optional(),
});

/**
 * Auth URL request schema
 */
export const GetAuthUrlInputSchema = z.object({
  redirectUri: z.string().url(),
  state: z.string(),
  scopes: z.array(z.string()),
});
export type GetAuthUrlInput = z.infer<typeof GetAuthUrlInputSchema>;

/**
 * Exchange code for token schema
 */
export const ExchangeCodeInputSchema = z.object({
  code: z.string(),
  redirectUri: z.string().url(),
  codeVerifier: z.string().optional(),
  scopes: z.array(z.string()),
});
export type ExchangeCodeInput = z.infer<typeof ExchangeCodeInputSchema>;

/**
 * Refresh token schema
 */
export const RefreshTokenInputSchema = z.object({
  refreshToken: z.string(),
  scope: z.array(z.string()).optional(),
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenInputSchema>;

/**
 * Revoke token schema
 */
export const RevokeTokenInputSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
});
export type RevokeTokenInput = z.infer<typeof RevokeTokenInputSchema>;

/**
 * Auth token response schema
 */
export const AuthTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number(),
  scope: z.array(z.string()).optional(),
  tokenType: z.string(),
});
export type AuthToken = z.infer<typeof AuthTokenSchema>;
