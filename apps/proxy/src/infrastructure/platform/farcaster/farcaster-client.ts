// src/infrastructure/platforms/farcaster/farcaster-client.ts
import { ApiErrorCode, Platform } from '@crosspost/types';
import { Env } from '../../../config/env.js';
import { BasePlatformClient } from '../abstract/base-platform-client.js';
import { PlatformClient } from '../abstract/platform-client.interface.js';
import { NearAuthService } from '../../security/near-auth-service.js';
import { ApiError } from '../../../errors/api-error.js';

import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { ViemLocalEip712Signer } from '@farcaster/hub-nodejs';
import { bytesToHex, hexToBytes } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';

type ManagedSigner = {
  signerUuid: string;
  publicKey: `0x${string}`;
  approvalUrl: string; // Warpcast deep link / QR target
  status: 'pending_approval' | 'approved' | 'revoked' | string;
  // optional helper metadata
  deadline?: number;
};

export class FarcasterClient extends BasePlatformClient implements PlatformClient {
  private client: NeynarAPIClient;

  constructor(
    env: Env,
    private nearAuthService: NearAuthService,
  ) {
    super(env, Platform.FARCASTER);

    if (!env.NEYNAR_API_KEY) {
      throw new Error('NEYNAR_API_KEY is required');
    }
    this.client = new NeynarAPIClient(
      new Configuration({ apiKey: env.NEYNAR_API_KEY }),
    );
  }

  /**
   * Upstash/HTTP clients need no explicit connect.
   */
  async initialize(): Promise<void> {
    return;
  }

  /**
   * Return a shared Neynar client (no per-user tokens for managed signers).
   */
  async getClientForUser(): Promise<NeynarAPIClient | null> {
    try {
      return this.client;
    } catch (err) {
      console.error('FarcasterClient: failed to get client', err);
      return null;
    }
  }

  /**
   * Optional: Identity OAuth URL via Neynar (NOT required for managed signers).
   * Kept to satisfy existing PlatformClient shape.
   */
  getAuthUrl(_redirectUri: string, state: string, scopes: string[]): string {
    // Identity OAuth (optional) – provides app login, not write perms.
    // If you don’t want OAuth at all, you can ignore this and drive the
    // managed-signer approval flow from your controller instead.
    // NOTE: generateOAuth2AuthLink is sync.
    const link = this.client.generateOAuth2AuthLink('', { scope: scopes, state });
    return link.url;
  }

  /**
   * Create a Neynar managed signer, sign the key with your developer mnemonic,
   * and register the signer. Returns the Warpcast deeplink/QR URL and signer UUID.
   *
   * Store signerUuid on your side (mapped to the NEAR wallet) OR
   * fetch later with Neynar APIs once approved.
   */
  async createManagedSigner(): Promise<ManagedSigner> {
    const mnemonic = this.env.FARCASTER_DEVELOPER_MNEMONIC;
    if (!mnemonic) {
      throw new Error('FARCASTER_DEVELOPER_MNEMONIC is required');
    }

    // 1) Create signer
    const created: CreateSignerResponse = await this.client.createSigner();

    // 2) Sign key request using your developer account (app FID)
    const { deadline, signature, appFid } = await this.generateKeyRequestSignature(
      created.public_key as `0x${string}`,
      mnemonic,
    );

    // 3) Register signer (Neynar will return a Warpcast deep link)
    const registered = await this.client.registerSignedKey({
      signerUuid: created.signer_uuid,
      appFid,
      deadline,
      signature,
    });

    return {
      signerUuid: created.signer_uuid,
      publicKey: created.public_key as `0x${string}`,
      approvalUrl: registered.signer_approval_url,
      status: created.status,
      deadline,
    };
  }

  /**
   * Publish a cast using an approved signer UUID.
   */
  async publishCast(params: {
    signerUuid: string;
    text: string;
    parent?: string; // parent cast hash (optional)
    embeds?: Array<{ url?: string }>;
  }): Promise<PublishCastResponse> {
    try {
      const res = await this.client.publishCast({
        signerUuid: params.signerUuid,
        text: params.text,
        parent: params.parent,
        embeds: params.embeds,
      });
      return res;
    } catch (err) {
      console.error('FarcasterClient: publishCast failed', err);
      // If this was an auth-ish error, scrub any stored signer linkage.
      // We don’t have per-user access/refresh tokens, but we may have
      // saved a mapping NEAR <-> signerUuid as a “token”. Clear it.
      // Caller should pass userId if you keep per-user mapping.
      throw new ApiError(ApiErrorCode.PLATFORM_ERROR, 'Failed to publish cast', {
        platform: Platform.FARCASTER,
      });
    }
  }

  /**
   * For compatibility with existing PlatformClient surface:
   * Farcaster managed signers DO NOT use OAuth token exchange.
   */
  async exchangeCodeForToken(): Promise<never> {
    throw new ApiError(
      ApiErrorCode.UNSUPPORTED_OPERATION,
      'Farcaster/Neynar managed signers do not use OAuth code exchange.',
      { platform: Platform.FARCASTER },
    );
  }

  async refreshPlatformToken(): Promise<never> {
    throw new ApiError(
      ApiErrorCode.UNSUPPORTED_OPERATION,
      'Farcaster/Neynar managed signers have no refresh token.',
      { platform: Platform.FARCASTER },
    );
  }

  async revokePlatformToken(): Promise<boolean> {
    // There is no token to revoke via API for managed signers.
    // Users can revoke in Warpcast; you can also rotate by creating a new signer.
    return true;
  }

  /**
   * When an auth-like error happens (e.g., signer revoked),
   * delete any stored linkage for this user.
   */
  async deleteTokensOnAuthError(userId: string): Promise<void> {
    console.warn(
      `FarcasterClient: cleaning stored signer mapping for user ${userId} due to auth error.`,
    );
    try {
      await this.nearAuthService.deleteTokens(userId, Platform.FARCASTER);
    } catch (e) {
      console.error('FarcasterClient: failed to delete stored mapping', e);
    }
  }

  /** -------------------- helpers -------------------- */

  /**
   * Resolve your app’s Farcaster FID using the developer mnemonic’s custody address.
   */
  private async getAppFid(mnemonic: string): Promise<number> {
    const account = mnemonicToAccount(mnemonic);
    const { user } = await this.client.lookupUserByCustodyAddress({
      custodyAddress: account.address as `0x${string}`,
    });
    if (!user?.fid) {
      throw new Error('Unable to resolve app FID from custody address');
    }
    return Number(user.fid);
  }

  /**
   * Produce the EIP-712 signature required to register a signer key.
   */
  private async generateKeyRequestSignature(
    publicKey: `0x${string}`,
    mnemonic: string,
  ): Promise<{ deadline: number; signature: `0x${string}`; appFid: number }> {
    const appFid = await this.getAppFid(mnemonic);
    const account = mnemonicToAccount(mnemonic);
    const signer = new ViemLocalEip712Signer(account);

    const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24h
    const keyBytes = hexToBytes(publicKey);

    const sig = await signer.signKeyRequest({
      requestFid: BigInt(appFid),
      key: keyBytes,
      deadline: BigInt(deadline),
    });

    if (sig.isErr()) {
      throw new Error('Failed to sign key request');
    }

    const signature = bytesToHex(sig.value) as `0x${string}`;
    return { deadline, signature, appFid };
  }
}
