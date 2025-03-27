import { TwitterApi } from 'twitter-api-v2';
import { Env } from '../index';
import { Errors } from '../middleware/errors';
import { BaseTwitterService } from './TwitterService';
import { ExtendedRequest } from '../types';

// Supported media types
const MEDIA_TYPES = {
  // Image formats
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  // Video format
  '.mp4': 'video/mp4',
};

// Media upload limitations
const MEDIA_LIMITS = {
  MAX_IMAGES_PER_TWEET: 4,
  MAX_VIDEOS_PER_TWEET: 1,
  MAX_VIDEO_SIZE_MB: 512,
  MAX_IMAGE_SIZE_MB: 5,
  CHUNK_SIZE_BYTES: 1024 * 1024, // 1MB chunks
};

/**
 * Media Service
 * Handles media upload operations
 */
export class MediaService extends BaseTwitterService {
  private oauth1Client: TwitterApi | null;

  constructor(env: Env) {
    super(env);

    // Initialize OAuth 1.0a client for media uploads if credentials are provided
    if (
      env.TWITTER_API_KEY &&
      env.TWITTER_API_SECRET &&
      env.TWITTER_ACCESS_TOKEN &&
      env.TWITTER_ACCESS_SECRET
    ) {
      try {
        this.oauth1Client = new TwitterApi({
          appKey: env.TWITTER_API_KEY,
          appSecret: env.TWITTER_API_SECRET,
          accessToken: env.TWITTER_ACCESS_TOKEN,
          accessSecret: env.TWITTER_ACCESS_SECRET,
        });
        console.log("OAuth 1.0a client initialized successfully");
      } catch (error) {
        console.error("Failed to initialize OAuth 1.0a client:", error);
        this.oauth1Client = null;
      }
    } else {
      console.warn("Missing OAuth 1.0a credentials - media uploads will not work");
      this.oauth1Client = null;
    }
  }

  /**
   * Upload media from a request
   */
  async uploadMedia(request: Request): Promise<Response> {
    try {
      // Check if OAuth 1.0a client is available
      if (!this.oauth1Client) {
        throw Errors.validation('Media uploads require OAuth 1.0a credentials which are not configured');
      }

      // Get the media from the request
      const formData = await request.formData();
      const media = formData.get('media');
      const mimeType = formData.get('mimeType') as string || 'application/octet-stream';

      if (!media) {
        throw Errors.validation('Media is required');
      }

      // Validate media type
      const isValidMediaType = Object.values(MEDIA_TYPES).includes(mimeType);
      if (!isValidMediaType) {
        throw Errors.validation(`Unsupported media type: ${mimeType}. Supported types: ${Object.values(MEDIA_TYPES).join(', ')}`);
      }

      // Convert to buffer if it's a string
      let mediaBuffer: Buffer;
      if (typeof media === 'string') {
        // Convert base64 string to buffer
        const base64Data = media.replace(/^data:image\/\w+;base64,/, '');
        mediaBuffer = Buffer.from(base64Data, 'base64');
      } else {
        // For FormData file entries, convert to buffer
        const arrayBuffer = await (media as unknown as Blob).arrayBuffer();
        mediaBuffer = Buffer.from(arrayBuffer);
      }

      // Check file size
      const isVideo = mimeType.startsWith('video/');
      const sizeInMB = mediaBuffer.byteLength / (1024 * 1024);

      if (isVideo && sizeInMB > MEDIA_LIMITS.MAX_VIDEO_SIZE_MB) {
        throw Errors.validation(`Video size exceeds maximum of ${MEDIA_LIMITS.MAX_VIDEO_SIZE_MB}MB`);
      } else if (!isVideo && sizeInMB > MEDIA_LIMITS.MAX_IMAGE_SIZE_MB) {
        throw Errors.validation(`Image size exceeds maximum of ${MEDIA_LIMITS.MAX_IMAGE_SIZE_MB}MB`);
      }

      // For large files, use chunked upload
      let mediaId: string;
      if (mediaBuffer.byteLength > MEDIA_LIMITS.CHUNK_SIZE_BYTES) {
        mediaId = await this.uploadLargeMedia(mediaBuffer, mimeType);
      } else {
        // Upload the media using OAuth 1.0a client
        mediaId = await this.oauth1Client.v1.uploadMedia(mediaBuffer);
      }

      // Store the media ID in D1 for tracking (if needed)
      // This would be implemented if we need to track media uploads

      return this.createJsonResponse({ media_id: mediaId });
    } catch (error) {
      console.error('Error uploading media:', error);
      return this.handleTwitterError(error);
    }
  }

  /**
   * Upload large media in chunks
   * Implements the chunked upload process for large media files
   */
  private async uploadLargeMedia(mediaBuffer: Buffer, mimeType: string): Promise<string> {
    if (!this.oauth1Client) {
      throw Errors.validation('Media uploads require OAuth 1.0a credentials which are not configured');
    }

    try {
      // Use the built-in upload method from twitter-api-v2
      // Note: The library handles chunking internally for large files
      const mediaId = await this.oauth1Client.v1.uploadMedia(mediaBuffer, { mimeType });

      // For videos, we need to wait for processing
      if (mimeType.startsWith('video/')) {
        await this.waitForMediaProcessing(mediaId);
      }

      return mediaId;
    } catch (error) {
      console.error('Error uploading large media:', error);
      throw Errors.twitterApi(
        'Failed to upload large media. The file may be too large.',
        'MEDIA_UPLOAD_ERROR'
      );
    }
  }

  /**
   * Wait for media processing to complete
   * Polls the media status endpoint until processing is complete
   */
  private async waitForMediaProcessing(mediaId: string): Promise<void> {
    if (!this.oauth1Client) {
      throw Errors.validation('Media processing requires OAuth 1.0a credentials which are not configured');
    }

    let processingInfo: any = { state: 'pending' };
    let retries = 0;
    const MAX_RETRIES = 10;

    while (processingInfo.state === 'pending' || processingInfo.state === 'in_progress') {
      if (retries >= MAX_RETRIES) {
        throw Errors.twitterApi(
          'Media processing timeout. Please try again later.',
          'MEDIA_PROCESSING_TIMEOUT'
        );
      }

      // Wait before checking status again
      const waitTime = processingInfo.check_after_secs ? processingInfo.check_after_secs * 1000 : 2000;
      await new Promise(resolve => setTimeout(resolve, waitTime));

      // Check media status
      const statusResult = await this.oauth1Client.v1.get(
        'media/upload',
        { command: 'STATUS', media_id: mediaId }
      );

      processingInfo = statusResult.processing_info;

      // If there's no processing info or it's succeeded, we're done
      if (!processingInfo || processingInfo.state === 'succeeded') {
        break;
      }

      // If there's an error, throw it
      if (processingInfo.state === 'failed') {
        throw Errors.twitterApi(
          `Media processing failed: ${processingInfo.error.message}`,
          'MEDIA_PROCESSING_FAILED'
        );
      }

      retries++;
    }
  }

  /**
   * Get media upload status
   * Retrieves the current status of a media upload
   */
  async getMediaStatus(request: Request): Promise<Response> {
    try {
      // Check if OAuth 1.0a client is available
      if (!this.oauth1Client) {
        throw Errors.validation('Media status checks require OAuth 1.0a credentials which are not configured');
      }

      // Get the media ID from the URL
      const url = new URL(request.url);
      const mediaId = url.pathname.split('/').pop();

      if (!mediaId) {
        throw Errors.validation('Media ID is required');
      }

      // Get the actual media status from Twitter
      const statusResult = await this.oauth1Client.v1.get(
        'media/upload',
        { command: 'STATUS', media_id: mediaId }
      );

      return this.createJsonResponse(statusResult);
    } catch (error) {
      console.error('Error getting media status:', error);
      return this.handleTwitterError(error);
    }
  }

  /**
   * Create media metadata (e.g., alt text) from a request
   * Sets metadata for a media upload, such as alt text for accessibility
   */
  async createMediaMetadata(request: Request): Promise<Response> {
    try {
      // Check if OAuth 1.0a client is available
      if (!this.oauth1Client) {
        throw Errors.validation('Media metadata requires OAuth 1.0a credentials which are not configured');
      }

      // Parse the request body
      const body = await request.json() as { media_id: string, alt_text: string };
      const { media_id, alt_text } = body;

      if (!media_id || !alt_text) {
        throw Errors.validation('Media ID and alt text are required');
      }

      // Set the alt text
      await this.oauth1Client.v2.createMediaMetadata(media_id, {
        alt_text: { text: alt_text }
      });

      return this.createJsonResponse({ success: true });
    } catch (error) {
      console.error('Error setting media metadata:', error);
      return this.handleTwitterError(error);
    }
  }
  
  /**
   * Upload media directly (without a request)
   * This method can be called directly from other services without creating a mock request
   */
  async uploadMediaDirect(
    mediaData: string | Buffer | Blob, 
    mimeType: string = 'application/octet-stream'
  ): Promise<string> {
    try {
      // Check if OAuth 1.0a client is available
      if (!this.oauth1Client) {
        throw Errors.validation('Media uploads require OAuth 1.0a credentials which are not configured');
      }

      // Convert to buffer if needed
      let mediaBuffer: Buffer;
      if (typeof mediaData === 'string') {
        // Convert base64 string to buffer
        const base64Data = mediaData.replace(/^data:image\/\w+;base64,/, '');
        mediaBuffer = Buffer.from(base64Data, 'base64');
      } else if (mediaData instanceof Blob) {
        // For Blob objects, convert to buffer
        const arrayBuffer = await mediaData.arrayBuffer();
        mediaBuffer = Buffer.from(arrayBuffer);
      } else {
        // Already a Buffer
        mediaBuffer = mediaData as Buffer;
      }

      // Validate media type
      const isValidMediaType = Object.values(MEDIA_TYPES).includes(mimeType);
      if (!isValidMediaType) {
        throw Errors.validation(`Unsupported media type: ${mimeType}. Supported types: ${Object.values(MEDIA_TYPES).join(', ')}`);
      }

      // Check file size
      const isVideo = mimeType.startsWith('video/');
      const sizeInMB = mediaBuffer.byteLength / (1024 * 1024);

      if (isVideo && sizeInMB > MEDIA_LIMITS.MAX_VIDEO_SIZE_MB) {
        throw Errors.validation(`Video size exceeds maximum of ${MEDIA_LIMITS.MAX_VIDEO_SIZE_MB}MB`);
      } else if (!isVideo && sizeInMB > MEDIA_LIMITS.MAX_IMAGE_SIZE_MB) {
        throw Errors.validation(`Image size exceeds maximum of ${MEDIA_LIMITS.MAX_IMAGE_SIZE_MB}MB`);
      }

      // For large files, use chunked upload
      let mediaId: string;
      if (mediaBuffer.byteLength > MEDIA_LIMITS.CHUNK_SIZE_BYTES) {
        mediaId = await this.uploadLargeMedia(mediaBuffer, mimeType);
      } else {
        // Upload the media using OAuth 1.0a client
        mediaId = await this.oauth1Client.v1.uploadMedia(mediaBuffer);
      }

      return mediaId;
    } catch (error) {
      console.error('Error uploading media directly:', error);
      throw error;
    }
  }

  /**
   * Set alt text directly (without a request)
   * This method can be called directly from other services without creating a mock request
   */
  async setAltTextDirect(mediaId: string, altText: string): Promise<void> {
    try {
      // Check if OAuth 1.0a client is available
      if (!this.oauth1Client) {
        throw Errors.validation('Media metadata requires OAuth 1.0a credentials which are not configured');
      }

      if (!mediaId || !altText) {
        throw Errors.validation('Media ID and alt text are required');
      }

      // Set the alt text
      await this.oauth1Client.v2.createMediaMetadata(mediaId, {
        alt_text: { text: altText }
      });
    } catch (error) {
      console.error('Error setting media metadata directly:', error);
      throw error;
    }
  }
}
