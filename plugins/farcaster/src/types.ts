/** Embed variants accepted by Neynar */
export type FarcasterEmbed =
  | { url: string }
  | { cast_id: { hash: string; fid: number } }
  | { castId: { hash: string; fid: number } };

/** Cast request params (matches POST /v2/farcaster/cast) */
export interface FarcasterCastParams {
  /** UUID of approved signer (paired with your API key) */
  signerUuid: string;

  /** Cast text (optional per API, but you'll usually set it) */
  text?: string;

  /** Max 2 embeds (TS-enforced tuple) */
  embeds?: [FarcasterEmbed] | [FarcasterEmbed, FarcasterEmbed];

  /** parent_url of a channel OR hash of the parent cast */
  parent?: string;

  /** Channel ID (e.g. "neynar", "farcaster", "warpcast") */
  channelId?: string;

  /** Idempotency key for safe retries */
  idem?: string;

  /** Parent author FID when replying */
  parentAuthorFid?: number;
}

/** Helper: turn IPFS CIDs into URL embeds */
export const cidEmbeds = (
  cids: string[],
  gateway = 'https://gateway.pinata.cloud/ipfs',
): FarcasterCastParams['embeds'] =>
  cids.slice(0, 2).map((cid) => ({
    url: `${gateway}/${cid}`,
  })) as FarcasterCastParams['embeds'];


