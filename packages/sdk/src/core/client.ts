/**
 * Main client for the Crosspost SDK
 */

import { PlatformName } from '@crosspost/types';
import { NearSigner } from '@crosspost/near-simple-signing';
import { CrosspostError } from '../errors/index.js';
import { ApiKeyAuthProvider } from '../auth/api-key-auth-provider.js';
import { AuthProvider } from '../auth/auth-provider.js';
import { NearAuthProvider } from '../auth/near-auth-provider.js';
import { PlatformClient } from '../platforms/platform-client.js';
import { TwitterClient } from '../platforms/twitter-client.js';

/**
 * Options for the CrosspostClient
 */
export interface CrosspostClientOptions {
  /**
   * Base URL for the Crosspost API
   */
  baseUrl: string;

  /**
   * Authentication configuration
   */
  auth: {
    /**
     * Authentication type
     */
    type: 'near';
    /**
     * NEAR signer
     */
    signer: NearSigner;
  } | {
    /**
     * Authentication type
     */
    type: 'apiKey';
    /**
     * API key
     */
    key: string;
  };

  /**
   * Default platform to use
   * @default PlatformName.TWITTER
   */
  defaultPlatform?: PlatformName;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Number of retries for failed requests
   * @default 3
   */
  retries?: number;
}

/**
 * Main client for the Crosspost SDK
 */
export class CrosspostClient {
  /**
   * Base URL for the Crosspost API
   */
  private readonly baseUrl: string;

  /**
   * Authentication provider
   */
  private readonly authProvider: AuthProvider;

  /**
   * Default platform to use
   */
  private readonly defaultPlatform: PlatformName;

  /**
   * Request timeout in milliseconds
   */
  private readonly timeout: number;

  /**
   * Number of retries for failed requests
   */
  private readonly retries: number;

  /**
   * Twitter client
   */
  public readonly twitter: PlatformClient;

  /**
   * Constructor
   * @param options Client options
   */
  constructor(options: CrosspostClientOptions) {
    this.baseUrl = options.baseUrl.endsWith('/') ? options.baseUrl.slice(0, -1) : options.baseUrl;
    this.defaultPlatform = options.defaultPlatform || PlatformName.TWITTER;
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;

    // Create auth provider based on options
    if (options.auth.type === 'near') {
      this.authProvider = new NearAuthProvider(options.auth.signer);
    } else {
      this.authProvider = new ApiKeyAuthProvider(options.auth.key);
    }

    // Create platform clients
    this.twitter = new TwitterClient({
      baseUrl: this.baseUrl,
      authProvider: this.authProvider,
      timeout: this.timeout,
      retries: this.retries,
    });

    // Additional platform clients can be added here
  }

  /**
   * Get a platform client by name
   * @param platform Platform name
   * @returns Platform client
   */
  public getPlatformClient(platform: PlatformName): PlatformClient {
    switch (platform) {
      case PlatformName.TWITTER:
        return this.twitter;
      // Add other platforms here as they are implemented
      default:
        throw new CrosspostError(
          `Platform ${platform} is not supported`,
          undefined,
          400,
          { supportedPlatforms: [PlatformName.TWITTER] },
          false,
        );
    }
  }

  /**
   * Get the default platform client
   * @returns Default platform client
   */
  public getDefaultPlatformClient(): PlatformClient {
    return this.getPlatformClient(this.defaultPlatform);
  }
}
