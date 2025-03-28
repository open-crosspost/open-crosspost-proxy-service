import { DEFAULT_CONFIG } from './../../../config/index.ts';
import { PlatformAuth } from '../abstract/platform-auth.interface.ts';
import { TwitterClient } from './twitter-client.ts';
import { TokenStorage, TokenType, TwitterTokens } from '../../storage/token-storage.ts';
import { Env } from '../../../config/env.ts';
import { TwitterApi } from 'twitter-api-v2';

// Define the auth state structure
interface AuthState {
  redirectUri: string;
  codeVerifier: string;
  state: string;
  createdAt: number;
  clientReturnUrl?: string; // Store the original client return URL
}

/**
 * Twitter Auth
 * Implements the PlatformAuth interface for Twitter
 */
export class TwitterAuth implements PlatformAuth {
  private env: Env;
  private twitterClient: TwitterClient;
  private tokenStorage: TokenStorage;
  private kv: Deno.Kv | null = null;
  
  constructor(env: Env) {
    this.env = env;
    this.twitterClient = new TwitterClient(env);
    this.tokenStorage = new TokenStorage(env.ENCRYPTION_KEY);
  }
  
  /**
   * Initialize the KV store
   */
  private async initializeKv(): Promise<void> {
    if (!this.kv) {
      this.kv = await Deno.openKv();
    }
  }
  
  /**
   * Initialize the authentication process
   * @param redirectUri The redirect URI for the OAuth callback
   * @param scopes The requested OAuth scopes
   * @returns The authentication URL and state
   */
  async initializeAuth(
    redirectUri: string,
    scopes: string[] = ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'like.write'],
    clientReturnUrl?: string
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
        { scope: [
          'tweet.read',
          'tweet.write',
          'users.read',
          'offline.access',
          'like.write'
        ] }
      );
      
      // Store the auth state in Deno KV
      const authState: AuthState = {
        redirectUri,
        codeVerifier,
        state,
        createdAt: Date.now(),
        clientReturnUrl // Store the client's return URL if provided
      };
      
      // Initialize KV store
      await this.initializeKv();
      
      if (!this.kv) {
        throw new Error("KV store not initialized");
      }
      
      // Store the state in KV with 1 hour expiration
      await this.kv.set(["auth", state], authState, {
        expireIn: 3600000 // 1 hour in milliseconds
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
   * @param savedState The state parameter saved during initialization (not used when using KV)
   * @param redirectUri The redirect URI used in the initial request (not used when using KV)
   * @param codeVerifier The PKCE code verifier (not used when using KV)
   * @returns The user ID and tokens
   */
  async handleCallback(
    code: string,
    state: string,
    savedState: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<{ userId: string; tokens: TwitterTokens; clientReturnUrl?: string }> {
    try {
      console.log("TwitterAuth.handleCallback called with:", { 
        code: code ? "present" : "missing", 
        state,
        savedState,
        redirectUri
      });
      
      // Initialize KV store
      await this.initializeKv();
      
      if (!this.kv) {
        throw new Error("KV store not initialized");
      }
      
      // Get the auth state from KV
      console.log("Looking up auth state in KV with key:", ["auth", state]);
      const authStateEntry = await this.kv.get<AuthState>(["auth", state]);
      const authState = authStateEntry.value;
      
      console.log("Auth state from KV:", authState ? "found" : "not found");
      
      if (!authState) {
        throw new Error('Invalid or expired state');
      }
      
      console.log("Auth state details:", {
        redirectUri: authState.redirectUri,
        codeVerifier: authState.codeVerifier ? "present" : "missing",
        state: authState.state,
        createdAt: new Date(authState.createdAt).toISOString(),
        clientReturnUrl: authState.clientReturnUrl || "not provided"
      });
      
      if (authState.clientReturnUrl) {
        console.log("Found clientReturnUrl in auth state:", authState.clientReturnUrl);
      }
      
      // Create a Twitter API client
      const twitterClient = new TwitterApi({
        clientId: this.env.TWITTER_CLIENT_ID,
        clientSecret: this.env.TWITTER_CLIENT_SECRET,
      });
      
      // Log the Twitter API credentials (redacted for security)
      console.log("Twitter API credentials:", {
        clientId: this.env.TWITTER_CLIENT_ID ? "present" : "missing",
        clientSecret: this.env.TWITTER_CLIENT_SECRET ? "present" : "missing"
      });
      
      // Log the OAuth parameters being sent to Twitter
      console.log("OAuth parameters:", {
        code: code ? "present" : "missing",
        codeVerifier: authState.codeVerifier ? "present" : "missing",
        redirectUri: authState.redirectUri
      });
      
      // Exchange the code for tokens using PKCE
      const { client: loggedClient, accessToken, refreshToken, expiresIn } =
        await twitterClient.loginWithOAuth2({
          code,
          codeVerifier: authState.codeVerifier,
          redirectUri: authState.redirectUri
        });
        
      console.log("Successfully exchanged code for tokens");
      
      let userId;
      try {
        // Try to get the user ID from the Twitter API
        const { data: userObject } = await loggedClient.v2.me();
        userId = userObject.id;
        console.log("Successfully retrieved user ID:", userId);
      } catch (error) {
        console.error("Error getting user ID from Twitter API:", error);
        
        // If we can't get the user ID, use a placeholder based on the access token
        // This is a workaround for the 403 error
        console.log("Using access token hash as user ID");
        userId = accessToken.slice(-20); // Use last 20 chars of access token as a unique ID
      }
      
      // Create tokens object
      const tokens: TwitterTokens = {
        accessToken,
        refreshToken: refreshToken || '',
        expiresAt: Date.now() + expiresIn * 1000,
        scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'like.write'],
        tokenType: TokenType.OAUTH2
      };
      
      // Save the tokens
      await this.tokenStorage.saveTokens(userId, tokens);
      
      // Delete the auth state from KV
      await this.kv.delete(["auth", state]);
      
      return {
        userId,
        tokens,
        clientReturnUrl: authState.clientReturnUrl
      };
    } catch (error) {
      console.error('Error handling callback:', error);
      throw error;
    }
  }
  
  /**
   * Refresh a user's access token
   * @param userId The user ID whose token should be refreshed
   * @returns The new tokens
   */
  async refreshToken(userId: string): Promise<TwitterTokens> {
    try {
      // Get the current tokens
      const tokens = await this.tokenStorage.getTokens(userId);
      
      // Check if refresh token exists
      if (!tokens.refreshToken) {
        throw new Error('No refresh token available');
      }
      
      // Create a Twitter API client
      const twitterClient = new TwitterApi({
        clientId: this.env.TWITTER_CLIENT_ID,
        clientSecret: this.env.TWITTER_CLIENT_SECRET,
      });
      
      try {
        // Refresh the token
        const { accessToken, refreshToken: newRefreshToken, expiresIn } = 
          await twitterClient.refreshOAuth2Token(tokens.refreshToken);
        
        // Create new tokens object
        const newTokens: TwitterTokens = {
          accessToken,
          refreshToken: newRefreshToken || tokens.refreshToken, // Use old refresh token if new one isn't provided
          expiresAt: Date.now() + expiresIn * 1000,
          scope: tokens.scope,
          tokenType: TokenType.OAUTH2
        };
        
        // Save the new tokens
        await this.tokenStorage.saveTokens(userId, newTokens);
        
        return newTokens;
      } catch (error: any) {
        // Handle specific Twitter API error for invalid token
        if (error.data?.error === 'invalid_request' || 
            (error.status === 400 && error.code === 'invalid_grant')) {
          await this.tokenStorage.deleteTokens(userId);
          throw new Error('User authentication expired. Please reconnect your Twitter account.');
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Failed to refresh token');
    }
  }
  
  /**
   * Revoke a user's tokens
   * @param userId The user ID whose tokens should be revoked
   * @returns True if the tokens were revoked
   */
  async revokeToken(userId: string): Promise<boolean> {
    try {
      // Get the tokens from storage
      const tokens = await this.tokenStorage.getTokens(userId);
      
      // Create a Twitter API client
      const twitterClient = new TwitterApi({
        clientId: this.env.TWITTER_CLIENT_ID,
        clientSecret: this.env.TWITTER_CLIENT_SECRET,
      });
      
      try {
        // Revoke the OAuth 2.0 tokens
        if (tokens.accessToken) {
          await twitterClient.revokeOAuth2Token(tokens.accessToken, 'access_token');
        }
        
        if (tokens.refreshToken) {
          await twitterClient.revokeOAuth2Token(tokens.refreshToken, 'refresh_token');
        }
      } catch (error) {
        // Log but continue - we still want to delete the tokens locally
        console.error('Error revoking tokens with Twitter API:', error);
      }
      
      // Delete the tokens from storage
      await this.tokenStorage.deleteTokens(userId);
      
      return true;
    } catch (error) {
      console.error('Error revoking token:', error);
      return false;
    }
  }
}
