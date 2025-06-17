import { ApiErrorCode, Platform } from '@crosspost/types';
import { TwitterApiCachePluginRedis } from '@twitter-api-v2/plugin-cache-redis';
import { TwitterApiRateLimitPlugin } from '@twitter-api-v2/plugin-rate-limit';
import { TwitterApiAutoTokenRefresher } from '@twitter-api-v2/plugin-token-refresher';
import { Redis } from '@upstash/redis';
import { ITwitterApiClientPlugin, TwitterApi } from 'twitter-api-v2';
import { Env } from '../../../config/env.ts';
import { AuthToken, TokenType } from '../../storage/auth-token-storage.ts';
import { BasePlatformClient } from '../abstract/base-platform-client.ts';
import { PlatformClient } from '../abstract/platform-client.interface.ts';
import { NearAuthService } from './../../security/near-auth-service.ts';
import { TwitterError } from './twitter-error.ts';
import { TWITTER_SCOPES } from './twitter-auth.ts';
import { ApiError } from '../../../errors/api-error.ts';

/**
 * Twitter Client
 * Implements the PlatformClient interface for Twitter
 */
export class TwitterClient extends BasePlatformClient implements PlatformClient {
  private rateLimitPlugin: TwitterApiRateLimitPlugin;
  private redisPlugin: TwitterApiCachePluginRedis | null = null;
  private redisClient: Redis | null = null;

  constructor(
    env: Env,
    private nearAuthService: NearAuthService,
  ) {
    super(env, Platform.TWITTER);
    this.rateLimitPlugin = new TwitterApiRateLimitPlugin();

    // Initialize Redis client if Upstash Redis credentials are available
    if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
      try {
        this.redisClient = new Redis({
          url: env.UPSTASH_REDIS_REST_URL,
          token: env.UPSTASH_REDIS_REST_TOKEN,
        });
        // Note: Upstash Redis adapter for twitter-api-v2 would need to be created
        // For now, we'll disable Redis caching until a compatible adapter is available
        this.redisPlugin = null;
      } catch (error) {
        console.error('Failed to initialize Redis client:', error);
      }
    }
  }

  /**
   * Initialize the client
   */
  async initialize(): Promise<void> {
    // Upstash Redis doesn't require explicit connection
  }

  /**
   * Get a Twitter client for a specific user
   * @param userId The user ID to get a client for
   * @returns A Twitter client instance
   */
  async getClientForUser(userId: string): Promise<TwitterApi | null> {
    try {
      const token = await this.nearAuthService.getTokens(userId, Platform.TWITTER);

      const autoRefresherPlugin = new TwitterApiAutoTokenRefresher({
        refreshToken: token.refreshToken || '',
        refreshCredentials: {
          clientId: this.env.TWITTER_CLIENT_ID,
          clientSecret: this.env.TWITTER_CLIENT_SECRET,
        },
        onTokenUpdate: async (refreshedTokenData) => {
          try {
            const newToken: AuthToken = {
              accessToken: refreshedTokenData.accessToken,
              refreshToken: refreshedTokenData.refreshToken,
              expiresAt: Date.now() + (refreshedTokenData.expiresIn || 7200) * 1000,
              scope: refreshedTokenData.scope,
              tokenType: TokenType.OAUTH2,
            };
            await this.nearAuthService.saveTokens(userId, Platform.TWITTER, newToken);
            console.log(`TwitterClient: Successfully refreshed and saved token for user ${userId}`);
          } catch (saveError) {
            console.error(`TwitterClient: Failed to save refreshed token for user ${userId}:`, saveError);
          }
        },
        onTokenRefreshError: async (error) => {
          console.error(`TwitterClient: Token refresh error for user ${userId} inside plugin:`, error);
          try {
            await this.nearAuthService.deleteTokens(userId, Platform.TWITTER);
            console.warn(`TwitterClient: Deleted tokens for user ${userId} due to refresh error.`);
          } catch (deleteError) {
            console.error(`TwitterClient: Failed to delete tokens for user ${userId} after refresh error:`, deleteError);
          }
        },
      });

      const plugins: ITwitterApiClientPlugin[] = [autoRefresherPlugin, this.rateLimitPlugin];
      if (this.redisPlugin) {
        plugins.push(this.redisPlugin);
      }

      const client = new TwitterApi(token.accessToken, { plugins });

      try {
        await client.v2.me({ 'user.fields': ['id'] });
      } catch (error) {
          console.warn(`TwitterClient: Post-client-creation validation failed for user ${userId}:`, error);
          const validationError = TwitterError.fromTwitterApiError(error);

          if (validationError.code === ApiErrorCode.UNAUTHORIZED) {
            console.warn(`TwitterClient: Authentication error detected (code: ${validationError.code}) for user ${userId}. Deleting tokens.`);
            await this.nearAuthService.deleteTokens(userId, Platform.TWITTER);
            return null; // Indicate client is not usable
          }
          // For other errors, rethrow to be caught by the outer catch if they are unexpected
          throw validationError; 
      }

      return client;

    } catch (error: unknown) {
      console.error(`TwitterClient: Error getting Twitter client for user ${userId} (outer catch):`, error);
      const processedError = (error instanceof ApiError) ? error : TwitterError.fromTwitterApiError(error);

      if (processedError.code === ApiErrorCode.NOT_FOUND || processedError.code === ApiErrorCode.UNAUTHORIZED) {
         // This means tokens were not found or were invalid from the start (e.g. expired with no refresh by NearAuthService, or a direct auth error caught here)
         console.warn(`TwitterClient: No valid client due to error (code: ${processedError.code}) for user ${userId}.`);
         return null;
      }

      return null;
    }
  }

  /**
   * Handles an authentication error for a user by deleting their tokens.
   * This is intended to be called when an operation using a client for this user
   * results in an authentication failure (e.g., 401, 400 from Twitter API).
   * @param userId The user ID whose tokens should be deleted.
   */
  async deleteTokensOnAuthError(userId: string): Promise<void> {
    console.warn(`TwitterClient: Deleting tokens for user ${userId} due to an authentication error.`);
    try {
      await this.nearAuthService.deleteTokens(userId, Platform.TWITTER);
      console.log(`TwitterClient: Successfully deleted tokens for user ${userId} due to auth error.`);
    } catch (deleteError) {
      console.error(`TwitterClient: Failed to delete tokens for user ${userId} after auth error:`, deleteError);
    }
  }

  /**
   * Get the authorization URL for the OAuth flow
   * @param redirectUri The redirect URI for the OAuth callback
   * @param state The state parameter for CSRF protection
   * @param scopes The requested OAuth scopes
   * @returns The authorization URL
   */
  getAuthUrl(redirectUri: string, state: string, scopes: string[]): string {
    const client = new TwitterApi({
      clientId: this.env.TWITTER_CLIENT_ID,
      clientSecret: this.env.TWITTER_CLIENT_SECRET,
    });

    const authLink = client.generateOAuth2AuthLink(redirectUri, {
      scope: scopes,
      state,
    });

    return authLink.url;
  }

  /**
   * Exchange an authorization code for access and refresh tokens
   * @param code The authorization code from the OAuth callback
   * @param redirectUri The redirect URI used in the initial request
   * @param codeVerifier The PKCE code verifier
   * @returns The OAuth tokens
   */
  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<AuthToken> {
    const client = new TwitterApi({
      clientId: this.env.TWITTER_CLIENT_ID,
      clientSecret: this.env.TWITTER_CLIENT_SECRET,
    });

    const { accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
      code,
      redirectUri,
      codeVerifier: codeVerifier || '',
    });

    // Get the user ID
    const loggedClient = new TwitterApi(accessToken);
    const { data: user } = await loggedClient.v2.me();

    // Create tokens object
    const token: AuthToken = {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      scope: TWITTER_SCOPES,
      tokenType: TokenType.OAUTH2,
    };

    // Save the tokens
    await this.nearAuthService.saveTokens(user.id, Platform.TWITTER, token);

    return token;
  }

  /**
   * Refresh a platform token using a refresh token
   * This method only interacts with the platform API and does not update storage
   * @param refreshToken The refresh token to use
   * @returns The new tokens from the platform
   * @throws PlatformError if the refresh fails
   */
  async refreshPlatformToken(refreshToken: string): Promise<AuthToken> {
    try {
      const client = new TwitterApi({
        clientId: this.env.TWITTER_CLIENT_ID,
        clientSecret: this.env.TWITTER_CLIENT_SECRET,
      });

      const { accessToken, refreshToken: newRefreshToken, expiresIn } = await client
        .refreshOAuth2Token(refreshToken);

      return {
        accessToken,
        refreshToken: newRefreshToken || refreshToken, // Use old refresh token if new one isn't provided
        expiresAt: Date.now() + expiresIn * 1000,
        scope: TWITTER_SCOPES,
        tokenType: TokenType.OAUTH2,
      };
    } catch (error) {
      throw TwitterError.fromTwitterApiError(error);
    }
  }

  /**
   * Revoke platform tokens
   * This method only interacts with the platform API and does not update storage
   * @param accessToken The access token to revoke
   * @param refreshToken The refresh token to revoke (if applicable)
   * @returns True if the revocation was successful
   * @throws PlatformError if the revocation fails
   */
  async revokePlatformToken(accessToken: string, refreshToken?: string): Promise<boolean> {
    try {
      // Create a Twitter API client
      const client = new TwitterApi({
        clientId: this.env.TWITTER_CLIENT_ID,
        clientSecret: this.env.TWITTER_CLIENT_SECRET,
      });

      // Revoke the OAuth 2.0 tokens
      if (accessToken) {
        await client.revokeOAuth2Token(accessToken, 'access_token');
      }

      if (refreshToken) {
        await client.revokeOAuth2Token(refreshToken, 'refresh_token');
      }

      return true;
    } catch (error) {
      console.error('Error revoking tokens with Twitter API:', error);

      const twitterError = TwitterError.fromTwitterApiError(error);
      // If it's an auth error (401), the token is already invalid/revoked
      if (twitterError.status === 401) {
        return true;
      }
      throw twitterError;
    }
  }
}
