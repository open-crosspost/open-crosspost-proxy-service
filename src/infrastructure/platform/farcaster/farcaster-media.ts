// farcaster-media.ts
import { MediaContent } from '@crosspost/types';
import { convertToBuffer, detectMimeType } from '../../../utils/media.utils.ts';
import {
  MediaStatusResult,
  MediaUploadResult,
  PlatformMedia,
} from '../abstract/platform-media.interface.ts';
import { MediaStorage } from '../../storage/media-storage.ts';
import { Env } from '../../../config/env.ts';
import { PinataSDK } from 'pinata';

type Limits = {
  MAX_IMAGE_SIZE_MB: number;
  MAX_VIDEO_SIZE_MB: number;
  ALLOW_UNDETECTED_MIME: boolean;
  CHECK_GATEWAY_AFTER_UPLOAD: boolean;
};

const DEFAULT_LIMITS: Limits = {
  MAX_IMAGE_SIZE_MB: 25, // tune as you wish
  MAX_VIDEO_SIZE_MB: 512, // generous; adjust per your plan
  ALLOW_UNDETECTED_MIME: false,
  CHECK_GATEWAY_AFTER_UPLOAD: false, // enable to HEAD-check after upload
};

const DEFAULT_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

function guessExtension(mime: string | undefined): string {
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

function isVideo(mime?: string) {
  return !!mime && mime.startsWith('video/');
}

export class FarcasterMedia implements PlatformMedia {
  // Note: Farcaster (via Neynar) doesn’t store media; this class only handles storage (Pinata/IPFS)
  // and “status” (gateway availability). Your cast creation step should embed the returned gateway URLs.

  private storage: MediaStorage;

  constructor(
    env: Env,
    private options: {
      limits?: Partial<Limits>;
      gatewayBaseUrl?: string; // if different from MediaStorage’s default
    } = {},
  ) {
    const pinata = new PinataSDK({
      pinataJwt: process.env.PINATA_JWT!,
      pinataGateway: 'example-gateway.mypinata.cloud',
    });

    this.storage = new MediaStorage();
  }

  private get limits(): Limits {
    return { ...DEFAULT_LIMITS, ...(this.options.limits ?? {}) };
  }

  private gatewayUrl(cid: string) {
    const base = this.options.gatewayBaseUrl ?? DEFAULT_GATEWAY;
    return `${base}/${cid}`;
  }

  /**
   * Upload media to IPFS (Pinata) and return a CID as the mediaId
   */
  async uploadMedia(
    userId: string,
    media: MediaContent,
  ): Promise<MediaUploadResult> {
    try {
      const buffer = await convertToBuffer(media.data);
      const detected = media.mimeType || detectMimeType(buffer);

      if (!detected && !this.limits.ALLOW_UNDETECTED_MIME) {
        throw new Error('Unable to detect MIME type for upload');
      }

      const sizeMB = buffer.byteLength / (1024 * 1024);
      const video = isVideo(detected);

      if (video && sizeMB > this.limits.MAX_VIDEO_SIZE_MB) {
        throw new Error(`Video size exceeds maximum of ${this.limits.MAX_VIDEO_SIZE_MB}MB`);
      }
      if (!video && sizeMB > this.limits.MAX_IMAGE_SIZE_MB) {
        throw new Error(`Image size exceeds maximum of ${this.limits.MAX_IMAGE_SIZE_MB}MB`);
      }

      const filename = media.filename ??
        `media-${Date.now()}-${Math.random().toString(16).slice(2)}.${guessExtension(detected)}`;

      const file = new File([buffer], filename, { type: detected || 'application/octet-stream' });

      // Include useful metadata for discoverability
      const keyvalues: Record<string, string> = {
        platform: 'farcaster',
        uploader: userId,
      };
      if (detected) keyvalues.mimeType = detected;
      if (media.altText) keyvalues.altText = media.altText;

      const uploaded = await this.storage.uploadFile(file, {
        name: filename,
        keyvalues,
        // optionally group uploads per cast or per user session
        // groupId: `user-${userId}`,
      });

      // Optionally probe the gateway right after upload (IPFS propagation)
      if (this.limits.CHECK_GATEWAY_AFTER_UPLOAD) {
        try {
          const res = await fetch(this.gatewayUrl(uploaded.cid), { method: 'HEAD' });
          if (!res.ok) {
            // Non-fatal — still return success; status API can reflect pending later
            // console.warn('Gateway HEAD not OK yet:', res.status);
          }
        } catch {
          // Ignore; propagation may take time
        }
      }

      // Conform to PlatformMedia.MediaUploadResult (mediaId is the CID)
      return { mediaId: uploaded.cid };
    } catch (error: unknown) {
      console.error('Error uploading media to IPFS:', error);
      if (error instanceof Error) throw error;
      throw new Error('Unknown error during media upload');
    }
  }

  /**
   * For IPFS, we treat “status” as gateway availability.
   * If HEAD to the gateway succeeds, we mark as succeeded; otherwise pending.
   */
  async getMediaStatus(_userId: string, mediaId: string): Promise<MediaStatusResult> {
    const url = this.gatewayUrl(mediaId);

    try {
      const res = await fetch(url, { method: 'HEAD' });
      const ok = res.ok;

      return {
        mediaId,
        state: ok ? 'succeeded' : 'pending',
        processingComplete: ok,
        progressPercent: ok ? 100 : 80, // heuristic; IPFS propagation isn’t strictly measurable
        error: ok ? undefined : {
          code: res.status,
          message: `Gateway not ready (HTTP ${res.status})`,
        },
      };
    } catch (e) {
      return {
        mediaId,
        state: 'pending',
        processingComplete: false,
        progressPercent: 50,
        error: e instanceof Error
          ? { code: -1, message: e.message }
          : { code: -1, message: 'Gateway probe failed' },
      };
    }
  }

  /**
   * Update media metadata (e.g., alt text)
   * Pinata’s upload APIs don’t universally support post-upload metadata mutation.
   * We implement a sidecar JSON persisted on IPFS that your app can reference.
   * (If you control a DB, prefer storing alt text there keyed by CID.)
   */
  async updateMediaMetadata(
    userId: string,
    mediaId: string,
    altText: string,
  ): Promise<boolean> {
    try {
      const sidecar = {
        cid: mediaId,
        altText,
        updatedBy: userId,
        updatedAt: new Date().toISOString(),
      };

      await this.storage.uploadJson(sidecar, {
        name: `alttext-${mediaId}.json`,
        keyvalues: {
          platform: 'farcaster',
          type: 'alttext',
          mediaCid: mediaId,
          updater: userId,
        },
        // Optionally group with the original upload group
        // groupId: `user-${userId}`,
      });

      // Note: Consumers must look up alt text from your DB or by CID→sidecar convention.
      return true;
    } catch (error: unknown) {
      console.error('Error setting alt text (sidecar):', error);
      if (error instanceof Error) throw error;
      throw new Error('Unknown error setting media metadata');
    }
  }
}
