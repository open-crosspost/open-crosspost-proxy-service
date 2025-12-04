import { Effect } from 'every-plugin/effect';
import { ClientFactory } from '../client-factory';
import * as MediaSchemas from '@crosspost/platform-contract';
import { PinataSDK } from 'pinata';
import { mapNeynarError } from '../utils/error-mapping';

export class MediaAdapter {
  private pinata: PinataSDK;

  constructor(
    private clientFactory: ClientFactory,
    pinataJwt: string,
    private ipfsGatewayUrl: string
  ) {
    if (!pinataJwt || pinataJwt.trim() === '') {
      throw new Error('Pinata JWT token is required for media uploads');
    }

    try {
      this.pinata = new PinataSDK({
        pinataJwt,
        pinataGateway: ipfsGatewayUrl.replace('/ipfs', ''),
      });

      // Validate that the SDK was initialized correctly
      if (!this.pinata || !this.pinata.upload) {
        throw new Error('Pinata SDK initialization failed. Check if JWT token is valid.');
      }
    } catch (error) {
      console.error('Failed to initialize Pinata SDK:', error);
      throw new Error(`Pinata SDK initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload media to IPFS via Pinata
   * @param input The input parameters for media upload
   * @returns The media upload result (CID as mediaId)
   */
  upload(input: MediaSchemas.UploadMediaInput): Effect.Effect<MediaSchemas.MediaUploadResult, Error> {
    const self = this;
    return Effect.gen(function* () {
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

      // Detect MIME type
      const mimeType = input.media.mimeType || self.detectMimeType(mediaBuffer);
      const filename = `media-${Date.now()}-${Math.random().toString(16).slice(2)}.${self.guessExtension(mimeType)}`;

      // Upload to IPFS
      const result = yield* Effect.tryPromise({
        try: async () => {
          // Validate Pinata SDK is available
          if (!self.pinata?.upload?.file) {
            throw new Error('Pinata SDK upload API is not available. Check if JWT token is valid and complete.');
          }

          const file = new File([mediaBuffer], filename, { type: mimeType || 'application/octet-stream' });
          
          const keyvalues: Record<string, string> = {
            platform: 'farcaster',
            uploader: input.userId || 'unknown',
          };
          if (mimeType) keyvalues.mimeType = mimeType;
          if (input.media.altText) keyvalues.altText = input.media.altText;

          const uploadResult = await self.pinata.upload.file(file)
            .addMetadata({
              name: filename,
              keyvalues: keyvalues,
            });

          return { mediaId: uploadResult.cid };
        },
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      return result;
    });
  }

  /**
   * Get media status (check IPFS gateway availability)
   * @param input The input parameters for getting media status
   * @returns The media status result
   */
  getStatus(input: MediaSchemas.GetMediaStatusInput): Effect.Effect<MediaSchemas.MediaStatusResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const url = `${self.ipfsGatewayUrl}/${input.mediaId}`;

      const res = yield* Effect.tryPromise({
        try: async () => await fetch(url, { method: 'HEAD' }),
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      const ok = res.ok;

      return {
        mediaId: input.mediaId,
        state: ok ? 'succeeded' : 'pending',
        processingComplete: ok,
        progressPercent: ok ? 100 : 80,
        error: ok ? undefined : {
          code: String(res.status),
          message: `Gateway not ready (HTTP ${res.status})`,
        },
      };
    });
  }

  /**
   * Update media metadata (alt text)
   * Stores alt text as sidecar JSON on IPFS
   * @param input The input parameters for updating media metadata
   * @returns True if successful
   */
  updateMetadata(input: MediaSchemas.UpdateMediaMetadataInput): Effect.Effect<boolean, Error> {
    const self = this;
    return Effect.gen(function* () {
      yield* Effect.tryPromise({
        try: async () => {
          // Validate Pinata SDK is available
          if (!self.pinata?.upload?.json) {
            throw new Error('Pinata SDK upload API is not available. Check if JWT token is valid and complete.');
          }

          const sidecar = {
            cid: input.mediaId,
            altText: input.altText,
            updatedBy: input.userId || 'unknown',
            updatedAt: new Date().toISOString(),
          };

          await self.pinata.upload.json(sidecar)
            .addMetadata({
              name: `alttext-${input.mediaId}.json`,
              keyvalues: {
                platform: 'farcaster',
                type: 'alttext',
                mediaCid: input.mediaId,
                updater: input.userId || 'unknown',
              },
            });
        },
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      return true;
    });
  }

  /** -------------------- helpers -------------------- */

  private guessExtension(mime: string | undefined): string {
    if (!mime) return 'bin';
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
    };
    return map[mime] ?? mime.split('/')[1] ?? 'bin';
  }

  private detectMimeType(buffer: Buffer): string | undefined {
    // Simple detection based on magic bytes
    if (buffer.length < 4) return undefined;

    const header = buffer.slice(0, 4);
    
    // JPEG: FF D8 FF
    if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
      return 'image/jpeg';
    }
    
    // PNG: 89 50 4E 47
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
      return 'image/png';
    }
    
    // GIF: 47 49 46 38
    if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) {
      return 'image/gif';
    }
    
    // WebP: Check for RIFF...WEBP
    if (buffer.length >= 12) {
      const webpHeader = buffer.slice(0, 12);
      if (webpHeader.toString('ascii', 0, 4) === 'RIFF' && 
          webpHeader.toString('ascii', 8, 12) === 'WEBP') {
        return 'image/webp';
      }
    }

    return undefined;
  }
}
