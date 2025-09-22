import { MediaCache } from '../../../../utils/media-cache.utils.ts';
import { FarcasterClient } from '../farcaster-client.ts';
import { FarcasterMedia } from '../farcaster-media.ts';
import { MediaContent } from '@crosspost/types';
import { FarcasterCastParams, FarcasterEmbed } from '../types.ts';

export abstract class FarcasterPostBase {
  protected farcasterClient: FarcasterClient;
  protected farcasterMedia: FarcasterMedia;
  private gatewayBaseUrl: string;

  constructor(
    farcasterClient: FarcasterClient,
    farcasterMedia: FarcasterMedia,
    gatewayBaseUrl = 'https://gateway.pinata.cloud/ipfs',
  ) {
    this.farcasterClient = farcasterClient;
    this.farcasterMedia = farcasterMedia;
    this.gatewayBaseUrl = gatewayBaseUrl;
  }

  protected async uploadMediaFiles(userId: string, mediaFiles: MediaContent[]): Promise<string[]> {
    if (!mediaFiles?.length) return [];
    const ids: string[] = [];
    const cache = MediaCache.getInstance();

    for (const media of mediaFiles) {
      const cached = await cache.getCachedMediaId(userId, media);
      if (cached) {
        ids.push(cached);
        continue;
      }

      const { mediaId } = await this.farcasterMedia.uploadMedia(userId, media);
      await cache.cacheMediaId(userId, media, mediaId);
      ids.push(mediaId);
    }
    return ids; // these are CIDs
  }

  /** Map CIDs -> { url } embeds and attach (max 2) */
  protected addEmbedsToCast(cast: FarcasterCastParams, cids: string[]): void {
    if (!cids?.length) return;

    const max = 2;
    const existing = (cast.embeds ? [...cast.embeds] : []) as FarcasterEmbed[];

    // dedupe against existing URL embeds
    const existingUrls = new Set(existing.flatMap((e) => ('url' in e ? [e.url] : [])));

    const newEmbeds = cids
      .map((cid) => ({ url: `${this.gatewayBaseUrl}/${cid}` } as FarcasterEmbed))
      .filter((e) => 'url' in e && !existingUrls.has(e.url));

    const merged = existing.concat(newEmbeds).slice(0, max);

    if (merged.length === 0) return;
    cast.embeds =
      (merged.length === 1 ? [merged[0]] : [merged[0], merged[1]]) as FarcasterCastParams['embeds'];
  }
}
