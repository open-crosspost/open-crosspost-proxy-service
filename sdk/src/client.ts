import { CrosspostApiClientOptions, DEFAULT_CONFIG, SupportedPlatform } from './config.ts';
import { createAuthHeaders, getCurrentAuthData, NearAuthData } from './auth.ts';
import {
  AccountStatusResponse,
  ApiResponse,
  AuthUrlResponse,
  CreatePostResponse,
  DeleteResult,
  LikeResult,
  PlatformAccount,
  PostRequest,
  RateLimitStatus,
} from './types/index.ts';

/**
 * CrosspostApiClient - A client for interacting with the Crosspost API
 * This class provides methods for making authenticated requests to the API
 */
export class CrosspostApiClient {
  private baseUrl: string;
  private authData: NearAuthData | null;
  private headers: Record<string, string>;
  private timeout: number;
  private retries: number;
  private debug: boolean;

  /**
   * Create a new CrosspostApiClient
   * @param options Configuration options
   */
  constructor(options: CrosspostApiClientOptions = {}) {
    const config = { ...DEFAULT_CONFIG, ...options };
    this.baseUrl = config.baseUrl;
    this.authData = config.authData || getCurrentAuthData();
    this.headers = { ...config.headers };
    this.timeout = config.timeout;
    this.retries = config.retries;
    this.debug = config.debug;
  }

  /**
   * Set authentication data
   * @param authData The authentication data to use
   */
  setAuthData(authData: NearAuthData | null): void {
    this.authData = authData;
  }

  /**
   * Set custom headers
   * @param headers The headers to use
   */
  setCustomHeaders(headers: Record<string, string>): void {
    this.headers = { ...this.headers, ...headers };
  }

  /**
   * Set request options
   * @param options The options to use
   */
  setRequestOptions(options: Partial<Pick<CrosspostApiClientOptions, 'timeout' | 'retries' | 'debug'>>): void {
    if (options.timeout !== undefined) this.timeout = options.timeout;
    if (options.retries !== undefined) this.retries = options.retries;
    if (options.debug !== undefined) this.debug = options.debug;
  }

  /**
   * Make an authenticated request to the API
   * @param endpoint - API endpoint path
   * @param method - HTTP method
   * @param body - Request body (optional)
   * @returns Promise resolving to the API response
   */
  private async request<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        ...this.headers,
        ...createAuthHeaders(this.authData),
      };
      
      const options: RequestInit = {
        method,
        headers,
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      if (this.debug) {
        console.log(`[Crosspost SDK] Request: ${method} ${url}`);
        if (body) console.log(`[Crosspost SDK] Request body:`, body);
      }
      
      const response = await fetch(url, options);
      const data = await response.json();
      
      if (this.debug) {
        console.log(`[Crosspost SDK] Response status: ${response.status}`);
        console.log(`[Crosspost SDK] Response data:`, data);
      }
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Error ${response.status}: ${response.statusText}`,
        };
      }
      
      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      if (this.debug) {
        console.error(`[Crosspost SDK] API request error (${endpoint}):`, error);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch all connected accounts for the authenticated NEAR user
   * @returns Promise resolving to the list of connected accounts
   */
  async fetchConnectedAccounts(): Promise<ApiResponse<PlatformAccount[]>> {
    const response = await this.request<{ accounts: PlatformAccount[] }>('/auth/accounts', 'GET');
    
    if (!response.success) {
      return {
        success: false,
        error: response.error
      };
    }
    
    // Handle nested data structure: { data: { accounts: [...] } }
    const accounts = response.data?.accounts || [];
    
    return {
      success: true,
      data: accounts,
    };
  }

  /**
   * Initiate the connection flow for a platform account
   * @param platform - Platform to connect
   * @param returnUrl - URL to return to after connection
   * @param options - Connection options
   * @returns Promise resolving to the auth URL or connection result
   */
  async connectPlatformAccount(
    platform: SupportedPlatform,
    returnUrl: string,
    options: {
      /**
       * Whether to use a popup window instead of redirecting the page
       * @default true
       */
      usePopup?: boolean;
      /**
       * Popup window features (width, height, etc.)
       */
      popupFeatures?: string;
      /**
       * Callback function to handle the connection result
       * Only used when usePopup is true
       */
      onComplete?: (result: { success: boolean; error?: string }) => void;
    } = {}
  ): Promise<ApiResponse<AuthUrlResponse>> {
    const { 
      usePopup = true, 
      popupFeatures = 'width=600,height=700,left=0,top=0',
      onComplete 
    } = options;
    
    const response = await this.request<AuthUrlResponse>(
      `/auth/${platform.toLowerCase()}/login`,
      'POST',
      { returnUrl }
    );
    
    // If successful and auth URL is provided
    if (response.success && response.data?.authUrl) {
      if (usePopup) {
        // Open a popup window for authentication
        const authWindow = window.open(
          response.data.authUrl,
          `${platform}Auth`,
          popupFeatures
        );
        
        if (!authWindow) {
          // Popup was blocked
          return {
            success: false,
            error: 'Popup window was blocked. Please allow popups for this site.'
          };
        }
        
        // Poll for completion
        if (typeof window !== 'undefined') {
          const pollTimer = window.setInterval(() => {
            try {
              // Check if auth is complete
              if (authWindow.closed) {
                window.clearInterval(pollTimer);
                if (onComplete) {
                  onComplete({ success: true });
                }
              }
            } catch (e) {
              // Handle errors
              window.clearInterval(pollTimer);
              if (onComplete) {
                onComplete({ 
                  success: false, 
                  error: e instanceof Error ? e.message : 'Authentication failed' 
                });
              }
            }
          }, 500);
        }
      } else {
        // Traditional redirect approach
        window.location.href = response.data.authUrl;
      }
    }
    
    return response;
  }

  /**
   * Disconnect a platform account
   * @param platform - Platform to disconnect
   * @param userId - User ID to disconnect
   * @returns Promise resolving to the API response
   */
  async disconnectPlatformAccount(
    platform: SupportedPlatform,
    userId: string
  ): Promise<ApiResponse> {
    return this.request(
      `/auth/${platform.toLowerCase()}/revoke`,
      'DELETE',
      { userId }
    );
  }

  /**
   * Refresh a platform account's token
   * @param platform - Platform to refresh
   * @param userId - User ID to refresh
   * @returns Promise resolving to the API response
   */
  async refreshPlatformAccount(
    platform: SupportedPlatform,
    userId: string
  ): Promise<ApiResponse> {
    return this.request(
      `/auth/${platform.toLowerCase()}/refresh`,
      'POST',
      { userId }
    );
  }

  /**
   * Check a platform account's status
   * @param platform - Platform to check
   * @param userId - User ID to check
   * @returns Promise resolving to the account status
   */
  async checkPlatformAccountStatus(
    platform: SupportedPlatform,
    userId: string
  ): Promise<ApiResponse<AccountStatusResponse>> {
    // Use query parameters instead of body for GET request
    const url = new URL(`${this.baseUrl}/auth/${platform.toLowerCase()}/status`);
    url.searchParams.append('userId', userId);
    
    try {
      const headers = {
        ...this.headers,
        ...createAuthHeaders(this.authData),
      };

      if (this.debug) {
        console.log(`[Crosspost SDK] Request: GET ${url.toString()}`);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (this.debug) {
        console.log(`[Crosspost SDK] Response status: ${response.status}`);
        console.log(`[Crosspost SDK] Response data:`, data);
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Error ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: { isConnected: data.isConnected || false },
      };
    } catch (error) {
      if (this.debug) {
        console.error(`[Crosspost SDK] Error checking ${platform} account status:`, error);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a post on selected platforms
   * @param postRequest - Post request data
   * @returns Promise resolving to the API response
   */
  async createPost(postRequest: PostRequest): Promise<ApiResponse<CreatePostResponse>> {
    return this.request<CreatePostResponse>('/api/post', 'POST', postRequest);
  }

  /**
   * Delete a post
   * @param platform - Platform to delete from
   * @param userId - User ID to delete from
   * @param postId - Post ID to delete
   * @returns Promise resolving to the API response
   */
  async deletePost(
    platform: SupportedPlatform,
    userId: string,
    postId: string
  ): Promise<ApiResponse<DeleteResult>> {
    return this.request<DeleteResult>(
      `/api/post/${postId}`,
      'DELETE',
      { platform, userId }
    );
  }

  /**
   * Like a post
   * @param platform - Platform to like on
   * @param userId - User ID to like from
   * @param postId - Post ID to like
   * @returns Promise resolving to the API response
   */
  async likePost(
    platform: SupportedPlatform,
    userId: string,
    postId: string
  ): Promise<ApiResponse<LikeResult>> {
    return this.request<LikeResult>(
      `/api/post/like/${postId}`,
      'POST',
      { platform, userId }
    );
  }

  /**
   * Unlike a post
   * @param platform - Platform to unlike on
   * @param userId - User ID to unlike from
   * @param postId - Post ID to unlike
   * @returns Promise resolving to the API response
   */
  async unlikePost(
    platform: SupportedPlatform,
    userId: string,
    postId: string
  ): Promise<ApiResponse<LikeResult>> {
    return this.request<LikeResult>(
      `/api/post/like/${postId}`,
      'DELETE',
      { platform, userId }
    );
  }

  /**
   * Get rate limit status for an endpoint
   * @param endpoint - Optional endpoint to check
   * @returns Promise resolving to the rate limit status
   */
  async getRateLimitStatus(endpoint?: string): Promise<ApiResponse<RateLimitStatus>> {
    const path = endpoint
      ? `/api/rate-limit/${endpoint}`
      : '/api/rate-limit';
      
    return this.request<RateLimitStatus>(path, 'GET');
  }
}
