import type { NearAuthData } from 'near-sign-verify';
import { AuthApi } from '../api/auth.ts';
import { PostApi } from '../api/post.ts';
import { type CrosspostClientConfig, DEFAULT_CONFIG } from './config.ts';
import type { RequestOptions } from './request.ts';
import { getAuthFromCookie, storeAuthInCookie } from '../utils/cookie.ts';

/**
 * Main client for interacting with the Crosspost API service.
 */
export class CrosspostClient {
  public readonly auth: AuthApi;
  public readonly post: PostApi;

  private readonly options: RequestOptions;

  /**
   * Creates an instance of CrosspostClient.
   * @param config Configuration options for the client.
   */
  constructor(config: CrosspostClientConfig = {}) {
    const baseUrl = config.baseUrl || DEFAULT_CONFIG.baseUrl; // you can deploy your own
    const timeout = config.timeout || DEFAULT_CONFIG.timeout;
    const retries = config.retries ?? DEFAULT_CONFIG.retries;

    const nearAuthData = config.nearAuthData || getAuthFromCookie();

    this.options = {
      baseUrl,
      timeout,
      retries,
      nearAuthData,
    };

    this.auth = new AuthApi(this.options);
    this.post = new PostApi(this.options);
  }

  /**
   * Sets the authentication data (signature) for the client and stores it in a cookie
   * @param signature The NEAR authentication data
   */
  public setAuthentication(nearAuthData: NearAuthData): void {
    this.options.nearAuthData = nearAuthData;
    storeAuthInCookie(nearAuthData);
  }

  /**
   * Checks if authentication data (signature) exists on client
   * @param signature The NEAR authentication data
   */
  public isAuthenticated(): boolean {
    return !!this.options.nearAuthData;
  }
}
