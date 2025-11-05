import { Effect } from 'every-plugin/effect';
import { ClientFactory } from '../client-factory';
import * as MediaSchemas from '@crosspost/platform-contract';

export class MediaAdapter {
  constructor(
    private clientFactory: ClientFactory
  ) {}

  /**
   * Upload media to Twitter
   * @param input The input parameters for media upload
   * @returns The media upload result
   */
  upload(input: MediaSchemas.UploadMediaInput): Effect.Effect<MediaSchemas.MediaUploadResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient(input.accessToken);

      // Convert media data to buffer
      let mediaBuffer: Buffer;
      if (typeof input.media.data === 'string') {
        mediaBuffer = Buffer.from(input.media.data, 'base64');
      } else if (input.media.data instanceof Blob) {
        const blob: Blob = input.media.data;
        const arrayBuffer = yield* Effect.tryPromise({
          try: async () => await blob.arrayBuffer(),
          catch: (error) => {
            console.error('Error reading blob data:', error);
            throw new Error('Failed to read media data');
          }
        });
        mediaBuffer = Buffer.from(arrayBuffer);
      } else {
        throw new Error('Unsupported media data type');
      }

      const result = yield* Effect.tryPromise({
        try: async () => {
          const mediaId = await client.v2.uploadMedia(mediaBuffer, {
            media_type: (input.media.mimeType || 'image/jpeg') as any,
          });

          // Set alt text if provided
          if (input.media.altText && mediaId) {
            await client.v2.createMediaMetadata(mediaId, {
              alt_text: { text: input.media.altText }
            });
          }

          return { mediaId };
        },
        catch: (error) => {
          console.error('Error uploading media:', error);
          throw new Error('Failed to upload media');
        }
      });

      return result;
    });
  }

  /**
   * Get media status
   * @param input The input parameters for getting media status
   * @returns The media status result
   */
  getStatus(input: MediaSchemas.GetMediaStatusInput): Effect.Effect<MediaSchemas.MediaStatusResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient(input.accessToken);

      const result = yield* Effect.tryPromise({
        try: async () => {
          const statusResult = await client.v1.get('media/upload', {
            command: 'STATUS',
            media_id: input.mediaId
          });

          const processingInfo = statusResult.processing_info;

          return {
            mediaId: input.mediaId,
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
        },
        catch: (error) => {
          console.error('Error getting media status:', error);
          throw new Error('Failed to get media status');
        }
      });

      return result;
    });
  }

  /**
   * Update media metadata
   * @param input The input parameters for updating media metadata
   * @returns True if successful
   */
  updateMetadata(input: MediaSchemas.UpdateMediaMetadataInput): Effect.Effect<boolean, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient(input.accessToken);

      yield* Effect.tryPromise({
        try: async () => {
          await client.v2.createMediaMetadata(input.mediaId, {
            alt_text: { text: input.altText }
          });
        },
        catch: (error) => {
          console.error('Error updating media metadata:', error);
          throw new Error('Failed to update media metadata');
        }
      });

      return true;
    });
  }
}
