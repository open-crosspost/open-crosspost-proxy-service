/**
 * Common Schemas and Types
 * Defines common Zod schemas and derived TypeScript types used across the API
 */

import { z } from "zod";

/**
 * Platform schema
 */
export const PlatformSchema = z.enum([
  'twitter',
  // Add more platforms as they're implemented
  // 'linkedin',
  // 'facebook',
  // 'instagram',
]).describe('Social media platform');

/**
 * OAuth token type schema
 */
export const TokenTypeSchema = z.enum([
  'oauth1',
  'oauth2',
]).describe('OAuth token type');

/**
 * OAuth tokens schema
 */
export const TokensSchema = z.object({
  accessToken: z.string().describe('Access token'),
  refreshToken: z.string().optional().describe('Refresh token (for OAuth 2.0)'),
  tokenSecret: z.string().optional().describe('Token secret (for OAuth 1.0a)'),
  tokenType: z.union([TokenTypeSchema, z.string()]).describe('Token type'),
  expiresAt: z.number().optional().describe('Expiration timestamp (in milliseconds since epoch)'),
  scope: z.union([z.string(), z.array(z.string())]).optional().describe('OAuth scopes'),
}).describe('OAuth tokens');

/**
 * Sort direction schema
 */
export const SortDirectionSchema = z.enum([
  'asc',
  'desc',
]).describe('Sort direction');

/**
 * Sort parameters schema
 */
export const SortParamsSchema = z.object({
  field: z.string().describe('Field to sort by'),
  direction: SortDirectionSchema.describe('Sort direction'),
}).describe('Sort parameters');

/**
 * Filter operator schema
 */
export const FilterOperatorSchema = z.enum([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'nin',
  'contains',
  'startsWith',
  'endsWith',
]).describe('Filter operator');

/**
 * Filter parameter schema
 */
export const FilterParamSchema = z.object({
  field: z.string().describe('Field to filter by'),
  operator: FilterOperatorSchema.describe('Filter operator'),
  value: z.any().describe('Filter value'),
}).describe('Filter parameter');

/**
 * Pagination parameters schema
 */
export const PaginationParamsSchema = z.object({
  page: z.number().optional().describe('Page number (1-based)'),
  perPage: z.number().optional().describe('Number of items per page'),
  cursor: z.string().optional().describe('Cursor for cursor-based pagination'),
}).describe('Pagination parameters');

/**
 * Query parameters schema
 */
export const QueryParamsSchema = z.object({
  pagination: PaginationParamsSchema.optional().describe('Pagination parameters'),
  sort: z.array(SortParamsSchema).optional().describe('Sort parameters'),
  filters: z.array(FilterParamSchema).optional().describe('Filter parameters'),
  fields: z.array(z.string()).optional().describe('Fields to include in the response'),
  include: z.array(z.string()).optional().describe('Relations to include in the response'),
}).describe('Query parameters');

/**
 * User ID schema
 */
export const UserIdSchema = z.string().describe('User ID on the platform');

/**
 * Platform and user ID schema
 */
export const PlatformUserSchema = z.object({
  platform: PlatformSchema,
  userId: UserIdSchema,
}).describe('Platform and user ID');

/**
 * Post ID schema
 */
export const PostIdSchema = z.string().describe('Post ID');

/**
 * Media ID schema
 */
export const MediaIdSchema = z.string().describe('Media ID');

/**
 * Media type schema
 */
export const MediaTypeSchema = z.enum([
  'image',
  'video',
  'gif',
  'audio',
]).describe('Media type');

/**
 * Media status schema
 */
export const MediaStatusSchema = z.enum([
  'pending',
  'processing',
  'failed',
  'succeeded',
]).describe('Media status');

/**
 * Timestamp schema
 */
export const TimestampSchema = z.string().datetime().describe('ISO 8601 timestamp');

/**
 * URL schema
 */
export const UrlSchema = z.string().url().describe('URL');

// Derive TypeScript types from Zod schemas
export type PlatformName = z.infer<typeof PlatformSchema>;

/**
 * Enum for supported platforms (for backward compatibility)
 */
export enum Platform {
  TWITTER = 'twitter',
  // Add more platforms as they're implemented
  // LINKEDIN = 'linkedin',
  // FACEBOOK = 'facebook',
  // INSTAGRAM = 'instagram',
}

/**
 * OAuth token types
 */
export enum TokenType {
  OAUTH1 = 'oauth1',
  OAUTH2 = 'oauth2',
}

export type Tokens = z.infer<typeof TokensSchema>;
export type SortDirection = z.infer<typeof SortDirectionSchema>;
export type SortParams = z.infer<typeof SortParamsSchema>;
export type FilterOperator = z.infer<typeof FilterOperatorSchema>;
export type FilterParam = z.infer<typeof FilterParamSchema>;
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
export type QueryParams = z.infer<typeof QueryParamsSchema>;

/**
 * API Error codes for standardized error identification
 */
export enum ApiErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // Authentication/Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST = 'INVALID_REQUEST',

  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',

  // Platform-specific errors
  PLATFORM_ERROR = 'PLATFORM_ERROR',
  PLATFORM_UNAVAILABLE = 'PLATFORM_UNAVAILABLE',

  // Content errors
  CONTENT_POLICY_VIOLATION = 'CONTENT_POLICY_VIOLATION',
  DUPLICATE_CONTENT = 'DUPLICATE_CONTENT',

  // Media errors
  MEDIA_UPLOAD_FAILED = 'MEDIA_UPLOAD_FAILED',

  // Post errors
  POST_CREATION_FAILED = 'POST_CREATION_FAILED',
  THREAD_CREATION_FAILED = 'THREAD_CREATION_FAILED',
  POST_DELETION_FAILED = 'POST_DELETION_FAILED',
  POST_INTERACTION_FAILED = 'POST_INTERACTION_FAILED',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
}
export type UserId = z.infer<typeof UserIdSchema>;
export type PlatformUser = z.infer<typeof PlatformUserSchema>;
export type PostId = z.infer<typeof PostIdSchema>;
export type MediaId = z.infer<typeof MediaIdSchema>;
export type MediaType = z.infer<typeof MediaTypeSchema>;
export type MediaStatus = z.infer<typeof MediaStatusSchema>;
export type Timestamp = z.infer<typeof TimestampSchema>;
export type Url = z.infer<typeof UrlSchema>;

/**
 * Media content type
 */
export interface MediaContent {
  data: string | Blob;
  mimeType?: string;
  altText?: string;
}

/**
 * Generic post content type
 */
export interface GenericPostContent {
  text?: string;
  media?: MediaContent[];
  platform?: PlatformName;
  userId?: string;
  postId?: string;
}

/**
 * NEAR Authentication Data
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
