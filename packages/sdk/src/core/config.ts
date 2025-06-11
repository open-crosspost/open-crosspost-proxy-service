/**
 * Configuration options for the CrosspostClient
 */
export interface CrosspostClientConfig {
  /**
   * Base URL for the Crosspost API
   * @default 'https://api.opencrosspost.com/'
   */
  baseUrl?: string | URL;
  /**
   * Auth token, obtained by near-sign-verify
   */
  authToken?: string;
  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;
}

/**
 * Default configuration values for the CrosspostClient
 */
export const DEFAULT_CONFIG: Required<Omit<CrosspostClientConfig, 'authToken'>> = {
  baseUrl: new URL('https://api.opencrosspost.com/'),
  timeout: 30000,
};
