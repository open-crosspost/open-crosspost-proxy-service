import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { MediaContent } from '@crosspost/types';

/**
 * Media Cache Utility
 * Provides temporary caching of media IDs to avoid duplicate uploads
 * within a single multi-account post operation
 */
export class MediaCache {
  private static instance: MediaCache;
  private cache: Map<string, Map<string, string>> = new Map();

  /**
   * Get the singleton instance of MediaCache
   * @returns The MediaCache instance
   */
  public static getInstance(): MediaCache {
    if (!MediaCache.instance) {
      MediaCache.instance = new MediaCache();
    }
    return MediaCache.instance;
  }

  /**
   * Generate a hash for media content to use as a cache key
   * @param media The media content to hash
   * @returns A hash string representing the media content
   */
  private async generateMediaHash(media: MediaContent): Promise<string> {
    try {
      // For string data (base64, URL, etc.)
      if (typeof media.data === 'string') {
        return createHash('sha256').update(media.data).digest('hex');
      }

      // For Blob data
      if (media.data instanceof Blob) {
        const arrayBuffer = await media.data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return createHash('sha256').update(buffer).digest('hex');
      }

      // Fallback using mime type and size if available
      const dataString = typeof media.data === 'string' ? media.data : 'blob-data';
      return `${media.mimeType || 'unknown'}-${dataString.length}`;
    } catch (error) {
      console.error('Error generating media hash:', error);
      // Fallback to a timestamp-based key if hashing fails
      return `fallback-${Date.now()}-${Math.random()}`;
    }
  }

  /**
   * Get a cached media ID for the given media content
   * @param userId The user ID to check cache for
   * @param media The media content to check in cache
   * @returns The cached media ID or null if not found
   */
  async getCachedMediaId(userId: string, media: MediaContent): Promise<string | null> {
    const hash = await this.generateMediaHash(media);
    const userCache = this.cache.get(userId);
    return userCache?.get(hash) || null;
  }

  /**
   * Store a media ID in the cache
   * @param userId The user ID to cache for
   * @param media The media content used as the cache key
   * @param mediaId The media ID to cache
   */
  async cacheMediaId(userId: string, media: MediaContent, mediaId: string): Promise<void> {
    const hash = await this.generateMediaHash(media);
    if (!this.cache.has(userId)) {
      this.cache.set(userId, new Map());
    }
    this.cache.get(userId)!.set(hash, mediaId);
  }

  /**
   * Clear the media cache
   * Should be called after completing a multi-account post operation
   */
  clearCache(): void {
    this.cache.clear();
  }
}
