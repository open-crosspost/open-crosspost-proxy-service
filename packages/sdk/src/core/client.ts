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

    const nearAuthData = config.nearAuthData;

    this.options = {
      baseUrl: baseUrl instanceof URL ? baseUrl : new URL(baseUrl),
      timeout,
      nearAuthData,
    };

    this.auth = new AuthApi(this.options);
    this.post = new PostApi(this.options);
    this.activity = new ActivityApi(this.options);
    this.system = new SystemApi(this.options);
  }

  /**
   * Sets the authentication data (signature) for the client
   * Required for non-GET requests
   * @param nearAuthData The NEAR authentication data
   */
  public setAuthentication(nearAuthData: NearAuthData): void {
    this.options.nearAuthData = nearAuthData;
    // Also set nearAccount from nearAuthData if not already set
    if (!this.options.nearAccount) {
      this.options.nearAccount = nearAuthData.account_id;
    }
  }

  /**
   * Sets the NEAR account ID for simplified GET request authentication
   * If not set, will use account_id from nearAuthData
   * @param nearAccount The NEAR account ID
   */
  public setNearAccount(nearAccount: string): void {
    this.options.nearAccount = nearAccount;
  }

  /**
   * Gets the current NEAR account ID being used for authentication
   * @returns The NEAR account ID from nearAccount or nearAuthData
   */
  public getNearAccount(): string | undefined {
    return this.options.nearAccount || this.options.nearAuthData?.account_id;
  }

  /**
   * Checks if authentication data (signature) exists on client
   * @returns true if nearAuthData is set (required for non-GET requests)
   */
  public isAuthenticated(): boolean {
    return !!this.options.nearAuthData;
  }

  /**
   * Checks if a NEAR account is set for GET request authentication
   * @returns true if either nearAccount or nearAuthData.account_id is set
   */
  public hasNearAccount(): boolean {
    return !!(this.options.nearAccount || this.options.nearAuthData?.account_id);
  }

  /**
   * Clears all authentication data from the client
   * This will prevent all requests from working until new authentication is set
   */
  public clear(): void {
    this.options.nearAuthData = undefined;
    this.options.nearAccount = undefined;
  }
}
