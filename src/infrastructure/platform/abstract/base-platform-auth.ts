import { Env } from '../../../config/env.ts';
import { PlatformName } from '@crosspost/types';
import { PrefixedKvStore } from '../../../utils/kv-store.utils.ts';
import { TokenStorage } from '../../storage/auth-token-storage.ts';
import { PlatformAuth } from './platform-auth.interface.ts';
import { PlatformClient } from './platform-client.interface.ts';
import { ApiErrorCode, PlatformError } from '@crosspost/types'; 
import { enhanceErrorWithContext } from '../../../utils/error-handling.utils.ts';
import type { StatusCode } from 'hono/utils/http-status';

/**
 * Base Platform Auth
 * Base implementation of the PlatformAuth interface with common functionality
 */
export abstract class BasePlatformAuth implements PlatformAuth {
  protected tokenStorage: TokenStorage;
  protected kvStore: PrefixedKvStore;

  /**
   * Create a new base platform auth
   * @param env Environment configuration
   * @param platform Platform name (e.g., 'twitter')
   */
  constructor(protected env: Env, protected platform: PlatformName) {
    this.tokenStorage = new TokenStorage(env.ENCRYPTION_KEY, env);
    this.kvStore = new PrefixedKvStore(['auth', platform]);
  }

  /**
   * Initialize the authentication process
   * @param signerId NEAR account ID for linking
   * @param redirectUri The redirect URI for the OAuth callback
   * @param scopes The requested OAuth scopes
   * @param successUrl The URL to redirect to on successful authentication
   * @param errorUrl The URL to redirect to on authentication failure
   * @returns The authentication URL and state
   * @throws PlatformError if the initialization fails
   */
  abstract initializeAuth(
    signerId: string,
    redirectUri: string,
    scopes: string[],
    successUrl?: string,
    errorUrl?: string,
  ): Promise<{ authUrl: string; state: string; codeVerifier?: string }>;

  /**
   * Get the auth state data from storage
   * @param state The state parameter from the callback
   * @returns The auth state data including successUrl and errorUrl
   * @throws PlatformError if the state is invalid or expired
   */
  abstract getAuthState(
    state: string,
  ): Promise<{ successUrl: string; errorUrl: string; signerId: string } | null>;

  /**
   * Handle the OAuth callback
   * @param code The authorization code from the OAuth callback
   * @param state The state parameter from the callback
   * @returns The user ID, tokens, and success URL
   * @throws PlatformError if the callback handling fails
   */
  abstract handleCallback(
    code: string,
    state: string,
  ): Promise<{ userId: string; tokens: any; successUrl: string }>;

  /**
   * Refresh a user's access token
   * This method manages the entire refresh process including storage
   * @param userId The user ID whose token should be refreshed
   * @returns The new tokens
   * @throws PlatformError if the refresh fails
   */
  async refreshToken(userId: string): Promise<any> {
    try {
      // Get current tokens
      const tokens = await this.tokenStorage.getTokens(userId, this.platform);

      if (!tokens.refreshToken) {
        throw new PlatformError(
          'No refresh token available',
          this.platform,
          ApiErrorCode.UNAUTHORIZED,
          false, // Not recoverable without re-auth
        );
      }

      // Get platform client
      const client = this.getPlatformClient();

      try {
        // Refresh token with platform API
        const newTokens = await client.refreshPlatformToken(tokens.refreshToken);

        // Save new tokens
        await this.tokenStorage.saveTokens(userId, newTokens, this.platform);

        return newTokens;
      } catch (error) {
        // Handle specific errors
        if (error instanceof PlatformError) {
          if (error.code === ApiErrorCode.UNAUTHORIZED) {
            // If the token is invalid (UNAUTHORIZED), delete it
            await this.tokenStorage.deleteTokens(userId, this.platform);
          }
          throw enhanceErrorWithContext(error, 'refreshToken');
        }

        // Re-throw other errors
        throw this.handleAuthError(error, 'refreshToken', userId); 
      }
    } catch (error) {
      if (error instanceof PlatformError) {
        throw enhanceErrorWithContext(error, 'refreshToken');
      }

      console.error(`Error refreshing token for ${userId}:`, error);
      throw this.handleAuthError(error, 'refreshToken', userId);
    }
  }

  /**
   * Revoke a user's tokens
   * This method manages the entire revocation process including storage
   * @param userId The user ID whose tokens should be revoked
   * @returns True if the revocation was successful
   * @throws PlatformError if the revocation fails
   */
  async revokeToken(userId: string): Promise<boolean> {
    try {
      // Get current tokens
      const tokens = await this.tokenStorage.getTokens(userId, this.platform);

      // Get platform client
      const client = this.getPlatformClient();

      try {
        // Revoke token with platform API
        await client.revokePlatformToken(tokens.accessToken, tokens.refreshToken);
      } catch (error) {
        // Log but continue - we still want to delete the tokens locally
        console.error(`Error revoking tokens with platform API for ${userId}:`, error);
      }

      // Delete tokens from storage
      await this.tokenStorage.deleteTokens(userId, this.platform);

      return true;
    } catch (error) {
      console.error(`Error revoking token for ${userId}:`, error);

      // If it's just a storage error, we can still consider it a success
      // since the tokens are likely already revoked on the platform
      if (error instanceof Error && error.message.includes('not found')) {
        return true;
      }

      return false;
    }
  }

  /**
   * Get the platform client
   * @returns The platform client
   */
  abstract getPlatformClient(): PlatformClient;

  /**
   * Handle common auth errors
   * @param error The error to handle
   * @param context Additional context for the error
   * @param userId Optional user ID associated with the error
   * @throws PlatformError with appropriate type
   */
  protected handleAuthError(error: unknown, context = '', userId?: string): PlatformError {
    console.error(`Auth Error ${context ? `(${context})` : ''} for user ${userId || 'unknown'}:`, error);

    // If it's already a PlatformError, just return it
    if (error instanceof PlatformError) {
      return error;
    }

    let message = 'An authentication error occurred';
    let apiErrorCode: ApiErrorCode = ApiErrorCode.UNAUTHORIZED; // Default to UNAUTHORIZED for auth errors
    let recoverable = false; // Default recoverable to false
    let status: number | undefined = 401; // Default status

    // Extract error details if available
    if (error instanceof Error) {
      message = error.message;
    }

    // Check for common error patterns
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, any>;

      // Check for token-related errors
      if (
        err.data?.error === 'invalid_token' ||
        err.data?.error === 'invalid_request' ||
        err.code === 'invalid_grant' ||
        message.includes('token') ||
        message.includes('expired')
      ) {
        apiErrorCode = ApiErrorCode.UNAUTHORIZED;
        message = 'Authentication token is invalid or expired';
        // Keep recoverable false, status 401
      } else if (err.status === 429 || message.includes('rate limit')) {
        apiErrorCode = ApiErrorCode.RATE_LIMITED;
        message = 'Rate limit exceeded';
        recoverable = true; // Rate limit errors are recoverable
        status = 429;
      } else if (
        err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT'
      ) {
        apiErrorCode = ApiErrorCode.NETWORK_ERROR;
        message = 'Network error occurred while authenticating';
        recoverable = true; // Network errors are often recoverable
        status = 502; // Bad Gateway often indicates upstream network issues
      }
      // Use err.status if available and not already handled (e.g., rate limit)
      else if (typeof err.status === 'number' && !status) {
         status = err.status;
      }
    }

    return new PlatformError(
      message,
      this.platform,
      apiErrorCode,
      recoverable,
      error, // Pass the original error object
      status as StatusCode | undefined,
      userId,
      undefined
    );
  }
}
