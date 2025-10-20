import { ActivityApi } from '../api/activity.ts';
import { AuthApi } from '../api/auth.ts';
import { PostApi } from '../api/post.ts';
import { SystemApi } from '../api/system.ts';
import { type CrosspostClientConfig, DEFAULT_CONFIG } from './config.ts';
import type { RequestOptions } from './request.ts';

/**
 * Main client for interacting with the Crosspost API service.
 */
export class CrosspostClient {
  public readonly auth: AuthApi;
  public readonly post: PostApi;
  public readonly activity: ActivityApi;
  public readonly system: SystemApi;

  private readonly options: RequestOptions;

  /**
   * Creates an instance of CrosspostClient.
   * @param config Configuration options for the client (authToken is required).
   */
  constructor(config: CrosspostClientConfig) {
    const baseUrl = config.baseUrl || DEFAULT_CONFIG.baseUrl; // you can deploy your own
    const timeout = config.timeout || DEFAULT_CONFIG.timeout;

    if (!config.authToken) {
      throw new Error(
        'authToken is required for CrosspostClient. All requests now require NEAR signature verification.',
      );
    }

    this.options = {
      baseUrl: baseUrl instanceof URL ? baseUrl : new URL(baseUrl),
      timeout,
      authToken: config.authToken,
    };

    this.auth = new AuthApi(this.options);
    this.post = new PostApi(this.options);
    this.activity = new ActivityApi(this.options);
    this.system = new SystemApi(this.options);
  }

  /**
   * Sets the authentication data (signature) for the client
   * Required for all requests
   * @param authToken The NEAR authentication data
   */
  public setAuthentication(authToken: string): void {
    this.options.authToken = authToken;
  }

  /**
   * Checks if authentication data (signature) exists on client
   * @returns true if authToken is set (required for all requests)
   */
  public isAuthenticated(): boolean {
    return !!this.options.authToken;
  }
  /**
   * Clears the authentication token from the client
   * This will prevent all requests from working until new authentication is set
   */
  public clear(): void {
    // Note: Setting to empty string instead of undefined to maintain type safety
    this.options.authToken = '';
  }
}
