/**
 * Main client for the Crosspost SDK
 */
import { NearAuthData } from 'near-sign-verify';
import { AuthApi } from '../api/auth.js';
import { PostApi } from '../api/post.js';
import { CrosspostClientConfig, DEFAULT_CONFIG } from './config.js';
import { RequestOptions } from './request.js';

/**
 * Main client for interacting with the Crosspost API service.
 */
export class CrosspostClient {
  /**
   * Authentication-related API operations
   */
  public readonly auth: AuthApi;

  /**
   * Post-related API operations
   */
  public readonly post: PostApi;

  private readonly options: RequestOptions;

  /**
   * Creates an instance of CrosspostClient.
   * @param config Configuration options for the client.
   */
  constructor(config: CrosspostClientConfig = {}) {
    // Merge provided config with defaults
    const baseUrl = config.baseUrl || DEFAULT_CONFIG.baseUrl;
    const timeout = config.timeout || DEFAULT_CONFIG.timeout;
    const retries = config.retries ?? DEFAULT_CONFIG.retries; // Use ?? to handle 0 as a valid value
    const nearAuthData = config.nearAuthData || {} as NearAuthData;

    // Create request options
    this.options = {
      baseUrl,
      timeout,
      retries,
      nearAuthData,
    };

    // Initialize API modules
    this.auth = new AuthApi(this.options);
    this.post = new PostApi(this.options);
  }
}
