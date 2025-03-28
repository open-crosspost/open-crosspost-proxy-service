/**
 * Types exports
 */
export * from './request.types.ts';
export * from './response.types.ts';
export * from './post.types.ts';

/**
 * Common types used throughout the application
 */

/**
 * OAuth token types
 */
export enum TokenType {
  OAUTH1 = 'oauth1',
  OAUTH2 = 'oauth2',
}

/**
 * OAuth tokens
 */
export interface Tokens {
  /**
   * Access token
   */
  accessToken: string;

  /**
   * Refresh token (for OAuth 2.0)
   */
  refreshToken?: string;

  /**
   * Token secret (for OAuth 1.0a)
   */
  tokenSecret?: string;

  /**
   * Token type
   */
  tokenType: TokenType | string;

  /**
   * Expiration timestamp (in milliseconds since epoch)
   */
  expiresAt?: number;

  /**
   * OAuth scopes
   */
  scope?: string | string[];
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  /**
   * Page number (1-based)
   */
  page?: number;

  /**
   * Number of items per page
   */
  perPage?: number;

  /**
   * Cursor for cursor-based pagination
   */
  cursor?: string;
}

/**
 * Sort direction
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Sort parameters
 */
export interface SortParams {
  /**
   * Field to sort by
   */
  field: string;

  /**
   * Sort direction
   */
  direction: SortDirection;
}

/**
 * Filter operator
 */
export enum FilterOperator {
  EQ = 'eq',
  NEQ = 'neq',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  IN = 'in',
  NIN = 'nin',
  CONTAINS = 'contains',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
}

/**
 * Filter parameter
 */
export interface FilterParam {
  /**
   * Field to filter by
   */
  field: string;

  /**
   * Filter operator
   */
  operator: FilterOperator;

  /**
   * Filter value
   */
  value: any;
}

/**
 * Query parameters
 */
export interface QueryParams {
  /**
   * Pagination parameters
   */
  pagination?: PaginationParams;

  /**
   * Sort parameters
   */
  sort?: SortParams[];

  /**
   * Filter parameters
   */
  filters?: FilterParam[];

  /**
   * Fields to include in the response
   */
  fields?: string[];

  /**
   * Relations to include in the response
   */
  include?: string[];
}
