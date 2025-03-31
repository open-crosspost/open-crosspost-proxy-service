/**
 * Crosspost SDK Configuration
 */

/**
 * Default API endpoint for the Crosspost API
 */
export const OPEN_CROSSPOST_PROXY_API = 'https://api.crosspost.example/v1';

/**
 * Supported social media platforms
 */
export enum SupportedPlatform {
  TWITTER = 'twitter',
  // Add more platforms as they're implemented
  // LINKEDIN = 'linkedin',
  // FACEBOOK = 'facebook',
  // INSTAGRAM = 'instagram',
}

/**
 * SDK configuration options
 */
export interface CrosspostApiClientOptions {
  /**
   * Base URL for the Crosspost API
   * @default OPEN_CROSSPOST_PROXY_API
   */
  baseUrl?: string;

  /**
   * Authentication data for NEAR wallet
   */
  authData?: any;

  /**
   * Custom headers to include in all requests
   */
  headers?: Record<string, string>;

  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Number of retries for failed requests
   * @default 3
   */
  retries?: number;

  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Default SDK configuration
 */
export const DEFAULT_CONFIG: Required<CrosspostApiClientOptions> = {
  baseUrl: OPEN_CROSSPOST_PROXY_API,
  authData: null,
  headers: {},
  timeout: 30000,
  retries: 3,
  debug: false,
};
