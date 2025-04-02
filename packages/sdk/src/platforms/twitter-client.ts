/**
 * Twitter client for the Crosspost SDK
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
import { CrosspostError } from '../errors/index.js';
import { BasePlatformClient } from './platform-client.js';

/**
 * Twitter client
 * Implements the PlatformClient interface for Twitter
 */
export class TwitterClient extends BasePlatformClient {
  /**
   * Platform name
   */
  protected readonly platformName = PlatformName.TWITTER;

  /**
   * Create a post
   * @param request Create post request
   * @returns Create post response
   */
  async createPost(request: CreatePostRequest): Promise<CreatePostResponse> {
    try {
      // Ensure the platform is set to Twitter
      const requestWithPlatform = {
        ...request,
        platform: this.platformName,
      };

      // Make the request to the API
      return await this.request<CreatePostResponse>(
        'POST',
        '/post/create',
        requestWithPlatform,
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to create post');
    }
  }

  /**
   * Repost/retweet a post
   * @param request Repost request
   * @returns Repost response
   */
  async repost(request: RepostRequest): Promise<RepostResponse> {
    try {
      // Ensure the platform is set to Twitter
      const requestWithPlatform = {
        ...request,
        platform: this.platformName,
      };

      // Make the request to the API
      return await this.request<RepostResponse>(
        'POST',
        '/post/repost',
        requestWithPlatform,
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to repost');
    }
  }

  /**
   * Quote a post
   * @param request Quote post request
   * @returns Quote post response
   */
  async quotePost(request: QuotePostRequest): Promise<QuotePostResponse> {
    try {
      // Ensure the platform is set to Twitter
      const requestWithPlatform = {
        ...request,
        platform: this.platformName,
      };

      // Make the request to the API
      return await this.request<QuotePostResponse>(
        'POST',
        '/post/quote',
        requestWithPlatform,
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to quote post');
    }
  }

  /**
   * Reply to a post
   * @param request Reply to post request
   * @returns Reply to post response
   */
  async replyToPost(request: ReplyToPostRequest): Promise<ReplyToPostResponse> {
    try {
      // Ensure the platform is set to Twitter
      const requestWithPlatform = {
        ...request,
        platform: this.platformName,
      };

      // Make the request to the API
      return await this.request<ReplyToPostResponse>(
        'POST',
        '/post/reply',
        requestWithPlatform,
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to reply to post');
    }
  }

  /**
   * Like a post
   * @param request Like post request
   * @returns Like post response
   */
  async likePost(request: LikePostRequest): Promise<LikePostResponse> {
    try {
      // Ensure the platform is set to Twitter
      const requestWithPlatform = {
        ...request,
        platform: this.platformName,
      };

      // Make the request to the API
      return await this.request<LikePostResponse>(
        'POST',
        '/post/like',
        requestWithPlatform,
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to like post');
    }
  }

  /**
   * Unlike a post
   * @param request Unlike post request
   * @returns Unlike post response
   */
  async unlikePost(request: UnlikePostRequest): Promise<UnlikePostResponse> {
    try {
      // Ensure the platform is set to Twitter
      const requestWithPlatform = {
        ...request,
        platform: this.platformName,
      };

      // Make the request to the API
      return await this.request<UnlikePostResponse>(
        'POST',
        '/post/unlike',
        requestWithPlatform,
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to unlike post');
    }
  }

  /**
   * Delete a post
   * @param request Delete post request
   * @returns Delete post response
   */
  async deletePost(request: DeletePostRequest): Promise<DeletePostResponse> {
    try {
      // Ensure the platform is set to Twitter
      const requestWithPlatform = {
        ...request,
        platform: this.platformName,
      };

      // Make the request to the API
      return await this.request<DeletePostResponse>(
        'POST',
        '/post/delete',
        requestWithPlatform,
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to delete post');
    }
  }

  /**
   * Upload media
   * @param request Media upload request
   * @returns Media upload response
   */
  async uploadMedia(request: MediaUploadRequest): Promise<MediaUploadResponse> {
    try {
      // Ensure the platform is set to Twitter
      const requestWithPlatform = {
        ...request,
        platform: this.platformName,
      };

      // Make the request to the API
      return await this.request<MediaUploadResponse>(
        'POST',
        '/media/upload',
        requestWithPlatform,
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to upload media');
    }
  }

  /**
   * Get media status
   * @param request Media status request
   * @returns Media status response
   */
  async getMediaStatus(request: MediaStatusRequest): Promise<MediaStatusResponse> {
    try {
      // Ensure the platform is set to Twitter
      const requestWithPlatform = {
        ...request,
        platform: this.platformName,
      };

      // Make the request to the API
      return await this.request<MediaStatusResponse>(
        'GET',
        `/media/status/${request.mediaId}`,
        requestWithPlatform,
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to get media status');
    }
  }

  /**
   * Update media metadata
   * @param request Media metadata update request
   * @returns Media metadata update response
   */
  async updateMediaMetadata(
    request: MediaMetadataUpdateRequest,
  ): Promise<MediaMetadataUpdateResponse> {
    try {
      // Ensure the platform is set to Twitter
      const requestWithPlatform = {
        ...request,
        platform: this.platformName,
      };

      // Make the request to the API
      return await this.request<MediaMetadataUpdateResponse>(
        'POST',
        '/media/metadata',
        requestWithPlatform,
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to update media metadata');
    }
  }

  /**
   * Handle errors
   * @param error Original error
   * @param defaultMessage Default error message
   * @returns CrosspostError
   */
  private handleError(error: unknown, defaultMessage: string): CrosspostError {
    if (error instanceof CrosspostError) {
      return error;
    }

    if (error instanceof Error) {
      return new CrosspostError(
        error.message || defaultMessage,
        undefined,
        undefined,
        { originalError: error.message },
        false,
      );
    }

    return new CrosspostError(
      defaultMessage,
      undefined,
      undefined,
      { originalError: String(error) },
      false,
    );
  }
}
