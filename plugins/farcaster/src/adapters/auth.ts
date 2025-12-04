import * as AuthSchemas from '@crosspost/platform-contract';
import { Effect } from 'every-plugin/effect';
import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { mnemonicToAccount } from 'viem/accounts';
import { ViemLocalEip712Signer } from '@farcaster/hub-nodejs';
import { bytesToHex, hexToBytes } from 'viem';
import { mapNeynarError } from '../utils/error-mapping';

export class AuthAdapter {
  constructor(
    private neynarApiKey: string,
    private farcasterDeveloperMnemonic: string
  ) {}

  /**
   * Get the authorization URL for managed signer flow
   * This generates a signer, signs the key request, and registers with Neynar
   * Returns a Warpcast approval URL
   * @param input The input parameters for getting auth URL
   * @returns The authorization URL (Warpcast approval URL) and state (signer UUID)
   */
  getAuthUrl(input: AuthSchemas.GetAuthUrlInput): Effect.Effect<string, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* Effect.tryPromise({
        try: async () => {
          return new NeynarAPIClient(
            new Configuration({ apiKey: self.neynarApiKey })
          );
        },
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      // 1) Create signer with Neynar
      const created = yield* Effect.tryPromise({
        try: async () => await client.createSigner(),
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      // 2) Sign the key request with developer account (app FID)
      const signatureData = yield* self.generateKeyRequestSignature(
        created.public_key as `0x${string}`,
        client
      );

      // 3) Register the signer -> returns Warpcast deeplink to approve
      const registered = yield* Effect.tryPromise({
        try: async () => await client.registerSignedKey({
          signerUuid: created.signer_uuid,
          appFid: signatureData.appFid,
          deadline: signatureData.deadline,
          signature: signatureData.signature,
        }),
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      // Return the Warpcast approval URL
      // Note: The signer UUID should be stored as the "state" for later use
      return registered.signer_approval_url || '';
    });
  }

  /**
   * Exchange authorization code for tokens
   * NOT SUPPORTED for Farcaster managed signers
   * @param input The input parameters for token exchange
   * @returns Never (throws error)
   */
  exchangeCodeForToken(input: AuthSchemas.ExchangeCodeInput): Effect.Effect<AuthSchemas.AuthToken, Error> {
    return Effect.fail(
      new Error('Farcaster managed signers do not use OAuth code exchange. Use getAuthUrl to get approval URL.')
    );
  }

  /**
   * Refresh an access token using a refresh token
   * NOT SUPPORTED for Farcaster managed signers
   * @param input The input parameters for token refresh
   * @returns Never (throws error)
   */
  refreshToken(input: AuthSchemas.RefreshTokenInput): Effect.Effect<AuthSchemas.AuthToken, Error> {
    return Effect.fail(
      new Error('Farcaster managed signers do not use refresh tokens.')
    );
  }

  /**
   * Revoke access and refresh tokens
   * Neynar doesn't support revocation via API, but we return success
   * @param input The input parameters for token revocation
   * @returns True if revocation was successful
   */
  revokeToken(input: AuthSchemas.RevokeTokenInput): Effect.Effect<boolean, Error> {
    // Neynar doesn't support token revocation via API
    // Users can revoke in Warpcast; we return success
    return Effect.succeed(true);
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

  private generateKeyRequestSignature(
    publicKey: `0x${string}`,
    client: NeynarAPIClient
  ): Effect.Effect<{ deadline: number; signature: `0x${string}`; appFid: number }, Error> {
    const self = this;
    return Effect.gen(function* () {
      const appFid = yield* Effect.tryPromise({
        try: async () => await self.getAppFid(self.farcasterDeveloperMnemonic, client),
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      const account = mnemonicToAccount(self.farcasterDeveloperMnemonic);
      const signer = new ViemLocalEip712Signer(account);

      const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 24h
      const keyBytes = hexToBytes(publicKey);

      const sig = yield* Effect.tryPromise({
        try: async () => {
          const result = await signer.signKeyRequest({
            requestFid: BigInt(appFid),
            key: keyBytes,
            deadline: BigInt(deadline),
          });
          if (result.isErr()) throw new Error('Failed to sign key request');
          return result.value;
        },
        catch: (error) => {
          throw mapNeynarError(error);
        }
      });

      const signature = bytesToHex(sig) as `0x${string}`;
      return { deadline, signature, appFid };
    });
  }
}
