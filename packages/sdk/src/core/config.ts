import type { NearAuthData as NearSignatureData } from 'near-sign-verify';

/**
 * Configuration options for the CrosspostClient
 */
export interface CrosspostClientConfig {
  /**
   * Base URL for the Crosspost API
   * @default 'https://api.opencrosspost.com'
   */
  baseUrl?: string;
  /**
   * NEAR authentication data obtained from @crosspost/near-simple-signing (TODO)
   */
  signature?: NearSignatureData;
  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;
  /**
   * Number of retries for failed requests (specifically for network errors or 5xx status codes)
   * @default 2
   */
  retries?: number;
}

/**
 * Default configuration values for the CrosspostClient
 */
export const DEFAULT_CONFIG: Required<Omit<CrosspostClientConfig, 'signature'>> = {
  baseUrl: 'https://open-crosspost-proxy.deno.dev/',
  timeout: 30000,
  retries: 2,
};
