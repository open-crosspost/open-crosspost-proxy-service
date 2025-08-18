import { ApiErrorCode, Platform } from '@crosspost/types';
import { Env } from '../../../config/env.ts';
import { PrefixedKvStore } from '../../../utils/kv-store.utils.ts';
import { BasePlatformAuth } from '../abstract/base-platform-auth.ts';
import { PlatformAuth } from '../abstract/platform-auth.interface.ts';
import { PlatformClient } from '../abstract/platform-client.interface.ts';
import { TwitterProfile } from './twitter-profile.ts';
import { NearAuthService } from '../../security/near-auth-service.ts';
import { FarcasterClient } from './farcaster-client.js';
import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { mnemonicToAccount } from 'viem/accounts';
import { ViemLocalEip712Signer } from '@farcaster/hub-nodejs';
import { bytesToHex, hexToBytes } from 'viem';
import { FarcasterError } from './farcaster-error.js';

export const TWITTER_SCOPES: string[] = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'offline.access',
  'like.write',
  'media.write',
];

export class FarcasterAuth extends BasePlatformAuth implements PlatformAuth {
  constructor(
    env: Env,
    nearAuthService: NearAuthService,
    kvStore: PrefixedKvStore,
    private farcasterClient: FarcasterClient,
    private twitterProfile: TwitterProfile,
  ) {
    super(env, Platform.FARCASTER, nearAuthService, kvStore);
  }

  /**
   * Get the platform client
   * @returns The platform client
   */
  getPlatformClient(): PlatformClient {
    return this.farcasterClient;
  }

  /**
   * Initialize the authentication process
   * @param redirectUri The redirect URI for the OAuth callback
   * @param scopes The requested OAuth scopes
   * @returns The authentication URL and state
   */
  async initializeAuth(
    redirectUri: string,
    scopes: string[],
  ): Promise<{ authUrl: string; state: string; codeVerifier?: string }> {
    try {
      const mnemonic = this.env.FARCASTER_DEVELOPER_MNEMONIC;
      if (!mnemonic) throw new Error('FARCASTER_DEVELOPER_MNEMONIC is required');

      const neynarClient = new NeynarAPIClient(
        new Configuration({ apiKey: this.env.NEYNAR_API_KEY }),
      );

      // 1) Create signer with Neynar
      const created = await neynarClient.createSigner();

      // 2) Sign the key request with your developer account (app FID)
      const { deadline, signature, appFid } = await this.generateKeyRequestSignature(
        created.public_key as `0x${string}`,
        mnemonic,
        neynarClient
      );

      // 3) Register the signer -> returns Warpcast deeplink to approve
      const registered = await neynarClient.registerSignedKey({
        signerUuid: created.signer_uuid,
        appFid,
        deadline,
        signature,
      });

      // Return an "authUrl" so the controller can respond with { url } like other platforms.
      // We use signer_uuid as "state" so AuthService can KV-store it uniformly.
      return {
        authUrl: registered.signer_approval_url || "",
        state: created.signer_uuid,
        // no PKCE in managed-signer flow
      };
    } catch (error) {
      console.error('Error initializing auth:', error);
      throw error;
    }
  }

  /**
   * Exchange an authorization code for tokens
   * @param code The authorization code from the OAuth callback
   * @param redirectUri The redirect URI used in the initial request
   * @param codeVerifier The PKCE code verifier (if applicable)
   * @returns The user ID and tokens
   * @throws PlatformError if the exchange fails
   */
  protected async exchangeCodeForTokens(): Promise<never> {
      throw new FarcasterError(
        'Farcaster managed signers do not use OAuth code exchange.',
        ApiErrorCode.INVALID_REQUEST,
        { operation: 'exchangeCodeForTokens' }
    );
  }

  /** -------------------- internal helpers -------------------- */

  private async getAppFid(mnemonic: string, client: NeynarAPIClient): Promise<number> {
    const account = mnemonicToAccount(mnemonic);
    const { user } = await client.lookupUserByCustodyAddress({
      custodyAddress: account.address as `0x${string}`,
    });
    if (!user?.fid) throw new Error('Unable to resolve app FID from custody address');
    return Number(user.fid);
  }

  private async generateKeyRequestSignature(
    publicKey: `0x${string}`,
    mnemonic: string,
    client: NeynarAPIClient
  ): Promise<{ deadline: number; signature: `0x${string}`; appFid: number }> {
    const appFid = await this.getAppFid(mnemonic, client);
    const account = mnemonicToAccount(mnemonic);
    const signer = new ViemLocalEip712Signer(account);

    const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24h
    const keyBytes = hexToBytes(publicKey);

    const sig = await signer.signKeyRequest({
      requestFid: BigInt(appFid),
      key: keyBytes,
      deadline: BigInt(deadline),
    });
    if (sig.isErr()) throw new Error('Failed to sign key request');

    const signature = bytesToHex(sig.value) as `0x${string}`;
    return { deadline, signature, appFid };
  }
}
