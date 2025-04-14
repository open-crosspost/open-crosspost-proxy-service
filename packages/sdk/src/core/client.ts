import type { NearAuthData } from 'near-sign-verify';
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
   * @param config Configuration options for the client.
   */
  constructor(config: CrosspostClientConfig = {}) {
    const baseUrl = config.baseUrl || DEFAULT_CONFIG.baseUrl; // you can deploy your own
    const timeout = config.timeout || DEFAULT_CONFIG.timeout;
    const retries = config.retries ?? DEFAULT_CONFIG.retries;

    const nearAuthData = config.nearAuthData;

    this.options = {
      baseUrl,
      timeout,
      retries,
      nearAuthData,
    };

    this.auth = new AuthApi(this.options);
    this.post = new PostApi(this.options);
    this.activity = new ActivityApi(this.options);
    this.system = new SystemApi(this.options);
  }

  /**
   * Sets the authentication data (signature) for the client
   * @param nearAuthData The NEAR authentication data
   */
  public setAuthentication(nearAuthData: NearAuthData): void {
    this.options.nearAuthData = nearAuthData;
  }

  /**
   * Checks if authentication data (signature) exists on client
   * @param signature The NEAR authentication data
   */
  public isAuthenticated(): boolean {
    return !!this.options.nearAuthData;
  }
}
