import * as AuthSchemas from '@crosspost/platform-contract';
import { Effect } from 'every-plugin/effect';
import { TwitterApi } from 'twitter-api-v2';

export class AuthAdapter {
  constructor(
    private clientId: string,
    private clientSecret: string
  ) { }

  /**
   * Get the authorization URL for OAuth flow
   * @param input The input parameters for getting auth URL
   * @returns The authorization URL
   */
  getAuthUrl(input: AuthSchemas.GetAuthUrlInput): Effect.Effect<string, Error> {
    return Effect.tryPromise({
      try: async () => {
        const client = new TwitterApi({
          clientId: this.clientId,
          clientSecret: this.clientSecret
        });

        const authLink = client.generateOAuth2AuthLink(input.redirectUri, {
          scope: input.scopes,
          state: input.state,
        });

        return authLink.url;
      },
      catch: (error) => {
        console.error('Error generating auth URL:', error);
        throw new Error('Failed to generate authorization URL');
      }
    });
  }

  /**
   * Exchange authorization code for access and refresh tokens
   * @param input The input parameters for token exchange
   * @returns The authentication tokens
   */
  exchangeCodeForToken(input: AuthSchemas.ExchangeCodeInput): Effect.Effect<AuthSchemas.AuthToken, Error> {
    return Effect.tryPromise({
      try: async () => {
        const client = new TwitterApi({
          clientId: this.clientId,
          clientSecret: this.clientSecret
        });

        const { accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
          code: input.code,
          redirectUri: input.redirectUri,
          codeVerifier: input.codeVerifier || '',
        });

        // Get user ID to associate with tokens
        const loggedClient = new TwitterApi(accessToken);
        const { data: user } = await loggedClient.v2.me();

        return {
          accessToken,
          refreshToken,
          expiresAt: Date.now() + (expiresIn * 1000),
          scope: input.scopes,
          tokenType: 'oauth2',
          userId: user.id
        };
      },
      catch: (error) => {
        console.error('Error exchanging code for token:', error);
        throw new Error('Failed to exchange authorization code for tokens');
      }
    });
  }

  /**
   * Refresh an access token using a refresh token
   * @param input The input parameters for token refresh
   * @returns The new authentication tokens
   */
  refreshToken(input: AuthSchemas.RefreshTokenInput): Effect.Effect<AuthSchemas.AuthToken, Error> {
    return Effect.tryPromise({
      try: async () => {
        const client = new TwitterApi({
          clientId: this.clientId,
          clientSecret: this.clientSecret
        });

        const { accessToken, refreshToken: newRefreshToken, expiresIn } = await client
          .refreshOAuth2Token(input.refreshToken);

        return {
          accessToken,
          refreshToken: newRefreshToken || input.refreshToken,
          expiresAt: Date.now() + (expiresIn * 1000),
          scope: input.scope,
          tokenType: 'oauth2'
        };
      },
      catch: (error) => {
        console.error('Error refreshing token:', error);
        throw new Error('Failed to refresh access token');
      }
    });
  }

  /**
   * Revoke access and refresh tokens
   * @param input The input parameters for token revocation
   * @returns True if revocation was successful
   */
  revokeToken(input: AuthSchemas.RevokeTokenInput): Effect.Effect<boolean, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = new TwitterApi({
        clientId: self.clientId,
        clientSecret: self.clientSecret
      });

      yield* Effect.tryPromise({
        try: async () => {
          try {
            // Revoke access token
            if (input.accessToken) {
              await client.revokeOAuth2Token(input.accessToken, 'access_token');
            }

            // Revoke refresh token  
            if (input.refreshToken) {
              await client.revokeOAuth2Token(input.refreshToken, 'refresh_token');
            }
          } catch (err) {
            // 401 means token already invalid/revoked - this is success
            if (err && typeof err === 'object' && 'status' in err && err.status === 401) {
              return; // Success - token already invalid
            }
            throw err; // Re-throw other errors
          }
        },
        catch: (error) => {
          console.error('Error revoking tokens:', error);
          return new Error('Failed to revoke tokens');
        }
      });

      return true;
    });
  }
}
