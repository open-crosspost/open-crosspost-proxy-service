import type { NearAuthData } from 'near-sign-verify';

/**
 * Configuration options for the CrosspostClient
 */
export interface CrosspostClientConfig {
  /**
   * Base URL for the Crosspost API
   * @default 'https://open-crosspost-proxy.deno.dev'
   */
  baseUrl?: string;
  /**
   * NEAR authentication data obtained from near-sign-verify
   */
  nearAuthData?: NearAuthData;
  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;
}

/**
 * Default configuration values for the CrosspostClient
 */
export const DEFAULT_CONFIG: Required<Omit<CrosspostClientConfig, 'nearAuthData'>> = {
  baseUrl: 'https://open-crosspost-proxy.deno.dev/',
  timeout: 30000,
};
