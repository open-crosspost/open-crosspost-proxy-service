import { Env } from '../index';
import { TokenStore, TwitterTokens } from '../services/tokenStore';
import { Errors } from '../middleware/errors';
import { extractUserId } from '../middleware/auth';
import * as jose from 'jose';
import { TwitterApi } from 'twitter-api-v2';

// Define the auth state structure
interface AuthState {
  redirectUri: string;
  codeVerifier: string;
  state: string;
  createdAt: number;
}

/**
 * Authentication handlers
 */
export const authRoutes = {
  /**
   * Initialize the OAuth 2.0 flow
   * This endpoint generates a PKCE code verifier and challenge,
   * stores the state in KV, and returns the authorization URL
   */
  async initAuth(request: Request): Promise<Response> {
    try {
      // Get the environment from the request
      const env = (request as any).env as Env;
      
      // Parse the request body
      const body = await request.json() as { redirectUri: string; scopes?: string[] };
      const { redirectUri, scopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] } = body;
      
      if (!redirectUri) {
        throw Errors.validation('Redirect URI is required');
      }
      
      // Create a Twitter API client
      const twitterClient = new TwitterApi({
        clientId: env.TWITTER_CLIENT_ID,
        clientSecret: env.TWITTER_CLIENT_SECRET,
      });
      
      // Generate the OAuth 2.0 auth link
      const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
        redirectUri, 
        { scope: scopes }
      );
      
      // Store the state in KV
      const authState: AuthState = {
        redirectUri,
        codeVerifier,
        state,
        createdAt: Date.now(),
      };
      
      await env.TOKENS.put(`auth:${state}`, JSON.stringify(authState), {
        expirationTtl: 3600, // Expire after 1 hour
      });
      
      // Return the authorization URL
      return new Response(JSON.stringify({ authUrl: url }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      throw error;
    }
  },
  
  /**
   * Handle the OAuth 2.0 callback
   * This endpoint exchanges the authorization code for tokens,
   * stores the tokens in KV, and redirects the user back to the client
   */
  async handleCallback(request: Request): Promise<Response> {
    try {
      // Get the environment from the request
      const env = (request as any).env as Env;
      
      // Get the query parameters
      const url = new URL(request.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      
      // Check for errors
      if (error) {
        throw Errors.authentication(`Twitter authorization error: ${error}`);
      }
      
      if (!code || !state) {
        throw Errors.validation('Code and state are required');
      }
      
      // Get the auth state from KV
      const authStateJson = await env.TOKENS.get(`auth:${state}`);
      
      if (!authStateJson) {
        throw Errors.authentication('Invalid or expired state');
      }
      
      const authState = JSON.parse(authStateJson) as AuthState;
      
      // Create a Twitter API client
      const twitterClient = new TwitterApi({
        clientId: env.TWITTER_CLIENT_ID,
        clientSecret: env.TWITTER_CLIENT_SECRET,
      });
      
      // Exchange the code for tokens
      const { client: loggedClient, accessToken, refreshToken, expiresIn } = 
        await twitterClient.loginWithOAuth2({
          code,
          codeVerifier: authState.codeVerifier,
          redirectUri: authState.redirectUri
        });
      
      // Get the user ID from the Twitter API
      const { data: userObject } = await loggedClient.v2.me();
      const userId = userObject.id;
      
      // Store the tokens in KV
      const tokenStore = new TokenStore(env);
      await tokenStore.saveTokens(userId, {
        accessToken,
        refreshToken: refreshToken || '',
        expiresAt: Date.now() + expiresIn * 1000,
        scope: 'tweet.read tweet.write users.read offline.access',
        tokenType: 'oauth2' // Always OAuth 2.0
      });
      
      // Delete the auth state from KV
      await env.TOKENS.delete(`auth:${state}`);
      
      // Redirect back to the client with the user ID
      const redirectUrl = new URL(authState.redirectUri);
      redirectUrl.searchParams.append('userId', userId);
      
      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl.toString(),
        },
      });
    } catch (error) {
      console.error('Error handling callback:', error);
      throw error;
    }
  },
  
  
  /**
   * Revoke a user's tokens
   * This endpoint revokes a user's tokens and deletes them from KV
   */
  async revokeToken(request: Request): Promise<Response> {
    try {
      // Get the environment from the request
      const env = (request as any).env as Env;
      
      // Get the user ID from the request
      const userId = extractUserId(request);
      
      // Get the tokens from KV
      const tokenStore = new TokenStore(env);
      const tokens = await tokenStore.getTokens(userId);
      
      // Create a Twitter API client
      const twitterClient = new TwitterApi({
        clientId: env.TWITTER_CLIENT_ID,
        clientSecret: env.TWITTER_CLIENT_SECRET,
      });
      
      // Revoke the OAuth 2.0 tokens
      if (tokens.accessToken) {
        await twitterClient.revokeOAuth2Token(tokens.accessToken, 'access_token');
      }
      
      if (tokens.refreshToken) {
        await twitterClient.revokeOAuth2Token(tokens.refreshToken, 'refresh_token');
      }
      
      // Delete the tokens from KV
      await tokenStore.deleteTokens(userId);
      
      // Return success
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error revoking token:', error);
      throw error;
    }
  }
};
