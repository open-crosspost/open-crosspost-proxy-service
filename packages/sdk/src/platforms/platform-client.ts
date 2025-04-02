/**
 * Platform client interface for the Crosspost SDK
 */

import {
  CreatePostRequest,
  CreatePostResponse,
  DeletePostRequest,
  DeletePostResponse,
  LikePostRequest,
  LikePostResponse,
  MediaMetadataUpdateRequest,
  MediaMetadataUpdateResponse,
  MediaStatusRequest,
  MediaStatusResponse,
  MediaUploadRequest,
  MediaUploadResponse,
  PlatformName,
  QuotePostRequest,
  QuotePostResponse,
  ReplyToPostRequest,
  ReplyToPostResponse,
  RepostRequest,
  RepostResponse,
  UnlikePostRequest,
  UnlikePostResponse,
} from '@crosspost/types';
import { AuthProvider } from '../auth/auth-provider.js';

/**
 * Platform client options
 */
export interface PlatformClientOptions {
  /**
   * Base URL for the Crosspost API
   */
  baseUrl: string;

  /**
   * Authentication provider
   */
  authProvider: AuthProvider;

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
 * Platform client interface
 * Defines the contract for platform-specific clients
 */
export interface PlatformClient {
  /**
   * Get the platform name
   * @returns Platform name
   */
  getPlatformName(): PlatformName;

  /**
   * Create a post
   * @param request Create post request
   * @returns Create post response
   */
  createPost(request: CreatePostRequest): Promise<CreatePostResponse>;

  /**
   * Repost/retweet a post
   * @param request Repost request
   * @returns Repost response
   */
  repost(request: RepostRequest): Promise<RepostResponse>;

  /**
   * Quote a post
   * @param request Quote post request
   * @returns Quote post response
   */
  quotePost(request: QuotePostRequest): Promise<QuotePostResponse>;

  /**
   * Reply to a post
   * @param request Reply to post request
   * @returns Reply to post response
   */
  replyToPost(request: ReplyToPostRequest): Promise<ReplyToPostResponse>;

  /**
   * Like a post
   * @param request Like post request
   * @returns Like post response
   */
  likePost(request: LikePostRequest): Promise<LikePostResponse>;

  /**
   * Unlike a post
   * @param request Unlike post request
   * @returns Unlike post response
   */
  unlikePost(request: UnlikePostRequest): Promise<UnlikePostResponse>;

  /**
   * Delete a post
   * @param request Delete post request
   * @returns Delete post response
   */
  deletePost(request: DeletePostRequest): Promise<DeletePostResponse>;

  /**
   * Upload media
   * @param request Media upload request
   * @returns Media upload response
   */
  uploadMedia(request: MediaUploadRequest): Promise<MediaUploadResponse>;

  /**
   * Get media status
   * @param request Media status request
   * @returns Media status response
   */
  getMediaStatus(request: MediaStatusRequest): Promise<MediaStatusResponse>;

  /**
   * Update media metadata
   * @param request Media metadata update request
   * @returns Media metadata update response
   */
  updateMediaMetadata(request: MediaMetadataUpdateRequest): Promise<MediaMetadataUpdateResponse>;
}

/**
 * Base platform client class
 * Provides common functionality for platform-specific clients
 */
export abstract class BasePlatformClient implements PlatformClient {
  /**
   * Base URL for the Crosspost API
   */
  protected readonly baseUrl: string;

  /**
   * Authentication provider
   */
  protected readonly authProvider: AuthProvider;

  /**
   * Request timeout in milliseconds
   */
  protected readonly timeout: number;

  /**
   * Number of retries for failed requests
   */
  protected readonly retries: number;

  /**
   * Platform name
   */
  protected abstract readonly platformName: PlatformName;

  /**
   * Constructor
   * @param options Platform client options
   */
  constructor(options: PlatformClientOptions) {
    this.baseUrl = options.baseUrl;
    this.authProvider = options.authProvider;
    this.timeout = options.timeout || 30000;
    this.retries = options.retries || 3;
  }

  /**
   * Get the platform name
   * @returns Platform name
   */
  getPlatformName(): PlatformName {
    return this.platformName;
  }

  /**
   * Create a post
   * @param request Create post request
   * @returns Create post response
   */
  abstract createPost(request: CreatePostRequest): Promise<CreatePostResponse>;

  /**
   * Repost/retweet a post
   * @param request Repost request
   * @returns Repost response
   */
  abstract repost(request: RepostRequest): Promise<RepostResponse>;

  /**
   * Quote a post
   * @param request Quote post request
   * @returns Quote post response
   */
  abstract quotePost(request: QuotePostRequest): Promise<QuotePostResponse>;

  /**
   * Reply to a post
   * @param request Reply to post request
   * @returns Reply to post response
   */
  abstract replyToPost(request: ReplyToPostRequest): Promise<ReplyToPostResponse>;

  /**
   * Like a post
   * @param request Like post request
   * @returns Like post response
   */
  abstract likePost(request: LikePostRequest): Promise<LikePostResponse>;

  /**
   * Unlike a post
   * @param request Unlike post request
   * @returns Unlike post response
   */
  abstract unlikePost(request: UnlikePostRequest): Promise<UnlikePostResponse>;

  /**
   * Delete a post
   * @param request Delete post request
   * @returns Delete post response
   */
  abstract deletePost(request: DeletePostRequest): Promise<DeletePostResponse>;

  /**
   * Upload media
   * @param request Media upload request
   * @returns Media upload response
   */
  abstract uploadMedia(request: MediaUploadRequest): Promise<MediaUploadResponse>;

  /**
   * Get media status
   * @param request Media status request
   * @returns Media status response
   */
  abstract getMediaStatus(request: MediaStatusRequest): Promise<MediaStatusResponse>;

  /**
   * Update media metadata
   * @param request Media metadata update request
   * @returns Media metadata update response
   */
  abstract updateMediaMetadata(request: MediaMetadataUpdateRequest): Promise<MediaMetadataUpdateResponse>;

  /**
   * Make an authenticated request to the API
   * @param method HTTP method
   * @param path API path
   * @param data Request data
   * @returns Response data
   */
  protected async request<T>(method: string, path: string, data?: any): Promise<T> {
    // Get authentication headers
    const authHeaders = await this.authProvider.getAuthHeaders();

    // Build the URL
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    // Build the request options
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...authHeaders,
      },
      body: data ? JSON.stringify(data) : undefined,
    };

    try {
      // Make the request
      const response = await fetch(url, options);

      // Parse the response
      const responseData = await response.json();

      // Check for errors
      if (!response.ok) {
        throw this.handleErrorResponse(response, responseData);
      }

      return responseData as T;
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw this.handleNetworkError(error);
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Handle error responses
   * @param response Fetch response
   * @param data Response data
   * @returns Error
   */
  protected handleErrorResponse(response: Response, data: any): Error {
    // TODO: Implement proper error handling based on the API's error format
    return new Error(`API error: ${response.status} ${response.statusText}`);
  }

  /**
   * Handle network errors
   * @param error Original error
   * @returns Error
   */
  protected handleNetworkError(error: TypeError): Error {
    // TODO: Implement proper network error handling
    return new Error(`Network error: ${error.message}`);
  }
}
