import { MediaContent } from '@crosspost/types';
import { EUploadMimeType } from 'twitter-api-v2';
import { convertToBuffer, detectMimeType } from '../../../utils/media.utils.ts';
import {
  MediaStatusResult,
  MediaUploadResult,
  PlatformMedia,
} from '../abstract/platform-media.interface.ts';
import { TwitterClient } from './twitter-client.ts';

const MEDIA_LIMITS = {
  MAX_IMAGES_PER_TWEET: 4,
  MAX_VIDEOS_PER_TWEET: 1,
  MAX_VIDEO_SIZE_MB: 512,
  MAX_IMAGE_SIZE_MB: 5,
  CHUNK_SIZE_BYTES: 1024 * 1024, // 1MB chunks
  ADDITIONAL_OWNERS_LIMIT: 100,
};

export class TwitterMedia implements PlatformMedia {
  private twitterClient: TwitterClient;

  constructor(twitterClient: TwitterClient) {
    this.twitterClient = twitterClient;
  }

  /**
   * Upload media to Twitter
   * @param userId The user ID uploading the media
   * @param media The media content to upload
   * @param additionalOwners Optional array of user IDs who can also use this media
   * @returns The media upload result
   */
  async uploadMedia(
    userId: string,
    media: MediaContent,
    additionalOwners?: string[],
  ): Promise<MediaUploadResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Convert media data to buffer
      const mediaBuffer = await convertToBuffer(media.data);
      const detectedType = media.mimeType || detectMimeType(mediaBuffer);
      const mimeType = detectedType as EUploadMimeType;

      // Check file size
      const isVideo = mimeType.startsWith('video/');
      const sizeInMB = mediaBuffer.byteLength / (1024 * 1024);

      if (isVideo && sizeInMB > MEDIA_LIMITS.MAX_VIDEO_SIZE_MB) {
        throw new Error(`Video size exceeds maximum of ${MEDIA_LIMITS.MAX_VIDEO_SIZE_MB}MB`);
      } else if (!isVideo && sizeInMB > MEDIA_LIMITS.MAX_IMAGE_SIZE_MB) {
        throw new Error(`Image size exceeds maximum of ${MEDIA_LIMITS.MAX_IMAGE_SIZE_MB}MB`);
      }

      // Validate additional owners
      if (additionalOwners && additionalOwners.length > MEDIA_LIMITS.ADDITIONAL_OWNERS_LIMIT) {
        throw new Error(
          `Too many additional owners. Maximum is ${MEDIA_LIMITS.ADDITIONAL_OWNERS_LIMIT}`,
        );
      }

      // Upload media using v2 endpoint
      const mediaId = await client.v2.uploadMedia(mediaBuffer, {
        media_type: mimeType,
      });

      // Set alt text if provided
      if (media.altText && mediaId) {
        await this.updateMediaMetadata(userId, mediaId, media.altText);
      }

      return { mediaId };
    } catch (error: unknown) {
      console.error('Error uploading media:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error during media upload');
    }
  }

  /**
   * Get the status of a media upload
   * @param userId The user ID checking the media status
   * @param mediaId The ID of the media to check
   * @returns The media status result
   */
  async getMediaStatus(userId: string, mediaId: string): Promise<MediaStatusResult> {
    try {
      // Get user-specific client
      const client = await this.twitterClient.getClientForUser(userId);

      // Get the media status from Twitter
      const statusResult = await client.v1.get(
        'media/upload',
        { command: 'STATUS', media_id: mediaId },
      );

      const processingInfo = statusResult.processing_info;

      return {
        mediaId,
        state: processingInfo ? processingInfo.state : 'succeeded',
        processingComplete: !processingInfo || processingInfo.state === 'succeeded',
        progressPercent: processingInfo ? processingInfo.progress_percent : 100,
        error: processingInfo && processingInfo.error
          ? {
            code: processingInfo.error.code,
            message: processingInfo.error.message,
          }
          : undefined,
      };
    } catch (error: unknown) {
      console.error('Error getting media status:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error getting media status');
    }
  }

  /**
   * Update media metadata (e.g., alt text) using v2 API
   * @param userId The user ID updating the metadata
   * @param mediaId The ID of the media to update
   * @param altText The alt text to set for the media
   * @returns True if the update was successful
   */
  async updateMediaMetadata(userId: string, mediaId: string, altText: string): Promise<boolean> {
    try {
      // Get user-specific client
      const client = await this.twitterClient.getClientForUser(userId);

      // Set the alt text
      await client.v2.createMediaMetadata(mediaId, {
        alt_text: {
          text: altText,
        },
      });

      return true;
    } catch (error: unknown) {
      console.error('Error setting media metadata:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error setting media metadata');
    }
  }
}
