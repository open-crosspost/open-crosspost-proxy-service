import { TwitterApi } from 'twitter-api-v2';
import { Env } from '../../../config/env.ts';
import { linkAccountToNear } from '../../../utils/account-linking.utils.ts';
import { KvStore } from '../../../utils/kv-store.utils.ts';
import { TokenType, TwitterTokens } from '../../storage/auth-token-storage.ts';
import { BasePlatformAuth } from '../abstract/base-platform-auth.ts';
import { PlatformAuth } from '../abstract/platform-auth.interface.ts';
import { PlatformClient } from '../abstract/platform-client.interface.ts';
import { TwitterClient } from './twitter-client.ts';
import { TwitterProfile } from './twitter-profile.ts';
import { Platform } from '../../../types/platform.types.ts';

// Define the auth state structure
interface AuthState {
  redirectUri: string;
  codeVerifier: string;
  state: string;
  createdAt: number;
  successUrl: string; // Store the original client return URL
  errorUrl: string; // Store the URL to redirect to on error
  signerId: string; // Store the NEAR account ID for linking
}

/**
 * Twitter Auth
 * Implements the PlatformAuth interface for Twitter
 */
export class TwitterAuth extends BasePlatformAuth implements PlatformAuth {
  private twitterClient: TwitterClient;
  private twitterProfile: TwitterProfile;

  constructor(env: Env) {
    super(env, Platform.TWITTER);
    this.twitterClient = new TwitterClient(env);
    this.twitterProfile = new TwitterProfile(env);
  }

  /**
   * Get the platform client
   * @returns The platform client
   */
  getPlatformClient(): PlatformClient {
    return this.twitterClient;
  }

  /**
   * Get the auth state data from storage
   * @param state The state parameter from the callback
   * @returns The auth state data including successUrl and errorUrl
   */
  async getAuthState(
    state: string,
  ): Promise<{ successUrl: string; errorUrl: string; signerId: string } | null> {
    try {
      // Get the auth state from KV using KvStore utility
      const authState = await KvStore.get<AuthState>(['auth', state]);

      if (!authState) {
        return null;
      }

      return {
        successUrl: authState.successUrl,
        errorUrl: authState.errorUrl,
        signerId: authState.signerId,
      };
    } catch (error) {
      console.error('Error getting auth state:', error);
      return null;
    }
  }

  /**
   * Initialize the authentication process
   * @param signerId NEAR account ID for linking
   * @param redirectUri The redirect URI for the OAuth callback
   * @param scopes The requested OAuth scopes
   * @param successUrl The URL to redirect to on successful authentication
   * @param errorUrl The URL to redirect to on authentication failure
   * @returns The authentication URL and state
   */
  async initializeAuth(
    signerId: string,
    redirectUri: string,
    scopes: string[],
    successUrl?: string,
    errorUrl?: string,
  ): Promise<{ authUrl: string; state: string; codeVerifier?: string }> {
    try {
      // Create a Twitter API client
      const twitterClient = new TwitterApi({
        clientId: this.env.TWITTER_CLIENT_ID,
        clientSecret: this.env.TWITTER_CLIENT_SECRET,
      });

      // Generate the OAuth 2.0 auth link with PKCE
      const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
        redirectUri,
        {
          scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'like.write'],
        },
      );

      // Store the auth state in Deno KV
      const authState: AuthState = {
        redirectUri,
        codeVerifier,
        state,
        createdAt: Date.now(),
        successUrl: successUrl || redirectUri, // Use redirect URI as fallback
        errorUrl: errorUrl || (successUrl || redirectUri), // Use success URL or redirect URI as fallback
        signerId, // Store the NEAR account ID
      };

      // Store the state in KV with 1 hour expiration using KvStore utility
      await KvStore.set(['auth', state], authState, {
        expireIn: 3600000, // 1 hour in milliseconds
      });

      return {
        authUrl: url,
        state,
        codeVerifier,
      };
    } catch (error) {
      console.error('Error initializing auth:', error);
      throw error;
    }
  }

  /**
   * Handle the OAuth callback
   * @param code The authorization code from the OAuth callback
   * @param state The state parameter from the callback
   * @returns The user ID and tokens
   */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ userId: string; tokens: TwitterTokens; successUrl: string }> {
    try {
      // Get the auth state from KV using KvStore utility
      const authState = await KvStore.get<AuthState>(['auth', state]);

      if (!authState) {
        throw new Error('Invalid or expired state');
      }

      // Create a Twitter API client
      const twitterClient = new TwitterApi({
        clientId: this.env.TWITTER_CLIENT_ID,
        clientSecret: this.env.TWITTER_CLIENT_SECRET,
      });

      // Exchange the code for tokens using PKCE
      const { client: loggedClient, accessToken, refreshToken, expiresIn } = await twitterClient
        .loginWithOAuth2({
          code,
          codeVerifier: authState.codeVerifier,
          redirectUri: authState.redirectUri,
        });

      // Get the user ID from the Twitter API
      const { data: userObject } = await loggedClient.v2.me();
      const userId = userObject.id;

      // Fetch and store the user profile
      // Pass isInitialAuth=true and the logged client to avoid token retrieval
      await this.twitterProfile.fetchUserProfile(userId, true, loggedClient);

      // Create tokens object
      const tokens: TwitterTokens = {
        accessToken,
        refreshToken: refreshToken || '',
        expiresAt: Date.now() + expiresIn * 1000,
        scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'like.write'],
        tokenType: TokenType.OAUTH2,
      };

      // Save the tokens
      await this.tokenStorage.saveTokens(userId, tokens, 'twitter');

      // Link the Twitter account to the NEAR wallet
      await linkAccountToNear(authState.signerId, 'twitter', userId, tokens, this.env);

      // Delete the auth state from KV using KvStore utility
      await KvStore.delete(['auth', state]);

      return {
        userId,
        tokens,
        successUrl: authState.successUrl,
      };
    } catch (error) {
      console.error('Error handling callback:', error);
      throw error;
    }
  }
}
