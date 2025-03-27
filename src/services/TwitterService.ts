import { TwitterApiAutoTokenRefresher } from '@twitter-api-v2/plugin-token-refresher';
import { TwitterApiRateLimitPlugin } from '@twitter-api-v2/plugin-rate-limit';
import { TwitterApiCachePluginRedis } from '@twitter-api-v2/plugin-cache-redis';
import { ApiPartialResponseError, ApiRequestError, ApiResponseError, ITwitterApiClientPlugin, TwitterApi } from 'twitter-api-v2';
import { createClient } from 'redis';
import { Env } from '../index';
import { Errors } from '../middleware/errors';
import { TokenStore, TwitterTokens } from './TokenService';

/**
 * Base Twitter Service
 * Handles common functionality like token management
 */
export class BaseTwitterService {
  protected env: Env;
  protected tokenStore: TokenStore;
  protected rateLimitPlugin: TwitterApiRateLimitPlugin;
  protected redisClient: any;
  protected redisPlugin: TwitterApiCachePluginRedis | null = null;

  constructor(env: Env) {
    this.env = env;
    this.tokenStore = new TokenStore(env);
    this.rateLimitPlugin = new TwitterApiRateLimitPlugin();
    
    // Initialize Redis client if REDIS_URL is available
    if (env.REDIS_URL) {
      try {
        this.redisClient = createClient({
          url: env.REDIS_URL
        });
        this.redisPlugin = new TwitterApiCachePluginRedis(this.redisClient, {
          // Use default TTL (rate limit reset time)
          // ttlIfNoRateLimit: 15 * 60 * 1000 // 15 minutes in milliseconds
        });
      } catch (error) {
        console.error('Failed to initialize Redis client:', error);
        // Continue without Redis cache if connection fails
      }
    }
  }

  /**
   * Get a user's tokens and create a Twitter client with auto token refresher
   */
  protected async getTwitterClient(userId: string): Promise<TwitterApi> {
    try {
      // Get the tokens from the token store
      const tokens = await this.tokenStore.getTokens(userId);

      // Create the auto refresher plugin for OAuth 2.0
      const autoRefresherPlugin = new TwitterApiAutoTokenRefresher({
        refreshToken: tokens.refreshToken || '',
        refreshCredentials: {
          clientId: this.env.TWITTER_CLIENT_ID,
          clientSecret: this.env.TWITTER_CLIENT_SECRET
        },
        onTokenUpdate: async (token) => {
          // Create new tokens object
          const newTokens: TwitterTokens = {
            accessToken: token.accessToken,
            refreshToken: token.refreshToken || tokens.refreshToken, // Use old refresh token if new one isn't provided
            expiresAt: Date.now() + 7200 * 1000, // Twitter tokens typically expire in 2 hours
            scope: tokens.scope,
            tokenType: 'oauth2'
          };

          // Save the new tokens
          await this.tokenStore.saveTokens(userId, newTokens);
        },
        onTokenRefreshError: async (error) => {
          console.error('Token refresh error:', error);

          // Handle specific Twitter API error for invalid token
          if (
            (error as any).data?.error === 'invalid_request' ||
            ((error as any).status === 400 && (error as any).code === 'invalid_grant')
          ) {
            await this.tokenStore.deleteTokens(userId);
            throw Errors.authentication('User authentication expired. Please reconnect your Twitter account.');
          }
        }
      });

      // Create plugins array with auto refresher and rate limit plugins
      const plugins: ITwitterApiClientPlugin[] = [autoRefresherPlugin, this.rateLimitPlugin];
      
      // Add Redis cache plugin if available
      if (this.redisPlugin) {
        plugins.push(this.redisPlugin);
      }

      // Create a Twitter client with the access token and plugins
      return new TwitterApi(tokens.accessToken, { plugins });
    } catch (error) {
      console.error('Error getting Twitter client:', error);
      throw error;
    }
  }

  /**
   * Get a user's tokens (for backward compatibility)
   */
  protected async getTokens(userId: string): Promise<TwitterTokens> {
    try {
      // Get the tokens from the token store
      return await this.tokenStore.getTokens(userId);
    } catch (error) {
      console.error('Error getting tokens:', error);
      throw error;
    }
  }

  /**
   * Create a standard JSON response
   */
  protected createJsonResponse(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Get the rate limit status for a specific endpoint
   * @param endpoint The endpoint to check rate limits for
   * @param version The API version (v1 or v2)
   */
  async getRateLimitStatus(endpoint: string, version: 'v1' | 'v2' = 'v2'): Promise<any> {
    try {
      return await this.rateLimitPlugin[version].getRateLimit(endpoint);
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return null;
    }
  }

  /**
   * Check if a rate limit has been hit
   * @param rateLimitStatus The rate limit status object
   */
  isRateLimited(rateLimitStatus: any): boolean {
    if (!rateLimitStatus) return false;
    return this.rateLimitPlugin.hasHitRateLimit(rateLimitStatus);
  }

  /**
   * Check if a rate limit status is obsolete (reset time has passed)
   * @param rateLimitStatus The rate limit status object
   */
  isRateLimitObsolete(rateLimitStatus: any): boolean {
    if (!rateLimitStatus) return true;
    return this.rateLimitPlugin.isRateLimitStatusObsolete(rateLimitStatus);
  }

  /**
   * Handle common Twitter API errors
   * This method properly handles the different error types from twitter-api-v2
   */
  protected handleTwitterError(error: any): Response {
    console.error('Twitter API error:', error);

    // Handle ApiRequestError (network errors, bad URL, etc.)
    if (error instanceof ApiRequestError) {
      console.error('Twitter API request error:', {
        message: error.message,
        type: error.type,
        requestError: error.requestError?.message
      });

      return new Response(JSON.stringify({
        error: {
          type: 'TWITTER_REQUEST',
          message: `Twitter API request failed: ${error.message}`,
          details: {
            requestError: error.requestError?.message,
            type: error.type
          }
        }
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle ApiPartialResponseError (partial responses)
    if (error instanceof ApiPartialResponseError) {
      console.error('Twitter API partial response error:', {
        message: error.message,
        type: error.type,
        responseError: error.responseError?.message,
        rawContent: error.rawContent?.toString().substring(0, 200) + '...'
      });

      return new Response(JSON.stringify({
        error: {
          type: 'TWITTER_PARTIAL_RESPONSE',
          message: `Twitter API partial response: ${error.message}`,
          details: {
            responseError: error.responseError?.message,
            type: error.type,
            rawContent: error.rawContent?.toString().substring(0, 200) + '...'
          }
        }
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle ApiResponseError (Twitter replies with an error)
    if (error instanceof ApiResponseError) {
      // Determine appropriate status code and error type
      let status = error.code || 502;
      let errorType = 'TWITTER_API';
      let message = error.message || 'Twitter API error';
      let retryAfter: number | undefined;

      // Check for rate limit errors
      if (error.rateLimitError) {
        status = 429;
        errorType = 'RATE_LIMIT';
        message = 'Rate limit exceeded. Please try again later.';

        // Calculate retry-after time if available
        if (error.rateLimit?.reset) {
          retryAfter = error.rateLimit.reset - Math.floor(Date.now() / 1000);
          retryAfter = Math.max(1, retryAfter); // Ensure positive value
        }
      }

      // Check for authentication errors
      if (error.isAuthError) {
        status = 401;
        errorType = 'AUTHENTICATION';
        message = 'Authentication failed. Your token may have expired.';
      }

      console.error(`Twitter API response error (${errorType}):`, {
        message: error.message,
        code: error.code,
        errors: error.errors,
        rateLimit: error.rateLimit,
        isAuthError: error.isAuthError,
        rateLimitError: error.rateLimitError
      });

      return new Response(JSON.stringify({
        error: {
          type: errorType,
          message: message,
          code: error.code?.toString(),
          details: {
            errors: error.errors,
            rateLimit: error.rateLimit
          }
        }
      }), {
        status,
        headers: {
          'Content-Type': 'application/json',
          ...(retryAfter ? { 'Retry-After': retryAfter.toString() } : {})
        }
      });
    }

    // Handle other errors
    return new Response(JSON.stringify({
      error: {
        type: 'INTERNAL',
        message: error.message || 'An unexpected error occurred',
        details: error.data || error
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
