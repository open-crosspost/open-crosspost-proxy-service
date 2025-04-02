import { z } from '../../../deps.ts';

/**
 * Auth Schemas
 * Defines Zod schemas for authentication-related requests and responses with OpenAPI metadata
 * Also exports TypeScript types derived from Zod schemas for type safety
 */

// Platform parameter schema
export const PlatformParamSchema = z.object({
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  })
}).openapi('PlatformParam');

// Auth initialization request schema
export const AuthInitRequestSchema = z.object({
  redirectUri: z.string().url().openapi({
    description: 'URI to redirect to after authentication',
    example: 'https://example.com/callback'
  }),
  scopes: z.array(z.string()).optional().openapi({
    description: 'OAuth scopes to request',
    example: ['tweet.read', 'tweet.write', 'users.read']
  }),
  successUrl: z.string().url().openapi({
    description: 'URL to redirect to on successful authentication',
    example: 'https://example.com/success'
  }),
  errorUrl: z.string().url().openapi({
    description: 'URL to redirect to on authentication error',
    example: 'https://example.com/error'
  })
}).openapi('AuthInitRequest');

// Auth initialization response schema
export const AuthInitResponseSchema = z.object({
  authUrl: z.string().url().openapi({
    description: 'URL to redirect the user to for authentication',
    example: 'https://twitter.com/i/oauth2/authorize?...'
  })
}).openapi('AuthInitResponse');

// Auth callback query schema
export const AuthCallbackQuerySchema = z.object({
  code: z.string().openapi({
    description: 'Authorization code from OAuth provider',
    example: 'abc123'
  }),
  state: z.string().openapi({
    description: 'State parameter for CSRF protection',
    example: 'xyz789'
  })
}).openapi('AuthCallbackQuery');

// Auth token status response schema
export const AuthTokenStatusResponseSchema = z.object({
  hasValidTokens: z.boolean().openapi({
    description: 'Whether the user has valid tokens',
    example: true
  }),
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  userId: z.string().optional().openapi({
    description: 'User ID on the platform (if available)',
    example: 'user123'
  }),
  expiresAt: z.string().datetime().optional().openapi({
    description: 'Token expiration timestamp (if available)',
    example: '2023-01-01T12:00:00Z'
  })
}).openapi('AuthTokenStatusResponse');

// Connected accounts response schema
export const ConnectedAccountSchema = z.object({
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  userId: z.string().openapi({
    description: 'User ID on the platform',
    example: 'user123'
  }),
  username: z.string().optional().openapi({
    description: 'Username on the platform (if available)',
    example: 'johndoe'
  }),
  profileImageUrl: z.string().url().optional().openapi({
    description: 'Profile image URL (if available)',
    example: 'https://example.com/profile.jpg'
  }),
  connectedAt: z.string().datetime().openapi({
    description: 'Timestamp when the account was connected',
    example: '2023-01-01T12:00:00Z'
  })
}).openapi('ConnectedAccount');

export const ConnectedAccountsResponseSchema = z.object({
  accounts: z.array(ConnectedAccountSchema).openapi({
    description: 'List of connected social media accounts'
  })
}).openapi('ConnectedAccountsResponse');

// NEAR authorization request schema
export const NearAuthorizationRequestSchema = z.object({
  // No additional parameters needed, as the NEAR account ID is extracted from the signature
}).openapi('NearAuthorizationRequest');

// NEAR authorization response schema
export const NearAuthorizationResponseSchema = z.object({
  success: z.boolean().openapi({
    description: 'Whether the authorization was successful',
    example: true
  }),
  signerId: z.string().openapi({
    description: 'NEAR account ID that was authorized',
    example: 'johndoe.near'
  })
}).openapi('NearAuthorizationResponse');

// NEAR authorization status response schema
export const NearAuthorizationStatusResponseSchema = z.object({
  isAuthorized: z.boolean().openapi({
    description: 'Whether the NEAR account is authorized',
    example: true
  }),
  signerId: z.string().openapi({
    description: 'NEAR account ID',
    example: 'johndoe.near'
  }),
  authorizedAt: z.string().datetime().optional().openapi({
    description: 'Timestamp when the account was authorized (if authorized)',
    example: '2023-01-01T12:00:00Z'
  })
}).openapi('NearAuthorizationStatusResponse');

// Export TypeScript types derived from Zod schemas
export type PlatformParam = z.infer<typeof PlatformParamSchema>;
export type AuthInitRequest = z.infer<typeof AuthInitRequestSchema>;
export type AuthInitResponse = z.infer<typeof AuthInitResponseSchema>;
export type AuthCallbackQuery = z.infer<typeof AuthCallbackQuerySchema>;
export type AuthTokenStatusResponse = z.infer<typeof AuthTokenStatusResponseSchema>;
export type ConnectedAccount = z.infer<typeof ConnectedAccountSchema>;
export type ConnectedAccountsResponse = z.infer<typeof ConnectedAccountsResponseSchema>;
export type NearAuthorizationRequest = z.infer<typeof NearAuthorizationRequestSchema>;
export type NearAuthorizationResponse = z.infer<typeof NearAuthorizationResponseSchema>;
export type NearAuthorizationStatusResponse = z.infer<typeof NearAuthorizationStatusResponseSchema>;
