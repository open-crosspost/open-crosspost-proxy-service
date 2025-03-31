import { Env } from '../../../config/env.ts';
import { PlatformClient } from './platform-client.interface.ts';
import { PlatformError, PlatformErrorType } from './platform-error.ts';

/**
 * Base Platform Client
 * Base implementation of the PlatformClient interface with common functionality
 */
export abstract class BasePlatformClient implements PlatformClient {
  /**
   * Create a new base platform client
   * @param env Environment configuration
   */
  constructor(protected env: Env) {}

  /**
   * Initialize the client with necessary credentials
   */
  abstract initialize(): Promise<void>;

  /**
   * Get a client instance for a specific user
   * @param userId The user ID to get a client for
   * @throws PlatformError if the client cannot be created
   */
  abstract getClientForUser(userId: string): Promise<any>;

  /**
   * Get the authorization URL for the OAuth flow
   * @param redirectUri The redirect URI for the OAuth callback
   * @param state The state parameter for CSRF protection
   * @param scopes The requested OAuth scopes
   * @returns The authorization URL
   */
  abstract getAuthUrl(redirectUri: string, state: string, scopes: string[]): string;

  /**
   * Exchange an authorization code for access and refresh tokens
   * @param code The authorization code from the OAuth callback
   * @param redirectUri The redirect URI used in the initial request
   * @param codeVerifier The PKCE code verifier (if applicable)
   * @returns The tokens from the platform
   * @throws PlatformError if the exchange fails
   */
  abstract exchangeCodeForToken(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<any>;

  /**
   * Refresh a platform token using a refresh token
   * This method only interacts with the platform API and does not update storage
   * @param refreshToken The refresh token to use
   * @returns The new tokens from the platform
   * @throws PlatformError if the refresh fails
   */
  abstract refreshPlatformToken(refreshToken: string): Promise<any>;

  /**
   * Revoke platform tokens
   * This method only interacts with the platform API and does not update storage
   * @param accessToken The access token to revoke
   * @param refreshToken The refresh token to revoke (if applicable)
   * @returns True if the revocation was successful
   * @throws PlatformError if the revocation fails
   */
  abstract revokePlatformToken(accessToken: string, refreshToken?: string): Promise<boolean>;

  /**
   * Handle common API errors
   * @param error The error to handle
   * @param context Additional context for the error
   * @throws PlatformError with appropriate type
   */
  protected handleApiError(error: unknown, context = ''): never {
    console.error(`API Error ${context ? `(${context})` : ''}:`, error);

    // Default error message
    let message = 'An unknown error occurred';
    let type = PlatformErrorType.UNKNOWN;
    let statusCode: number | undefined = undefined;

    // Extract error details if available
    if (error instanceof Error) {
      message = error.message;
    }

    // Check for common error patterns
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, any>;

      // Check for status code
      if (typeof err.status === 'number') {
        statusCode = err.status;
      } else if (typeof err.statusCode === 'number') {
        statusCode = err.statusCode;
      }

      // Check for error message
      if (typeof err.message === 'string') {
        message = err.message;
      } else if (err.data?.message) {
        message = err.data.message;
      } else if (err.error?.message) {
        message = err.error.message;
      }

      // Determine error type based on status code and error content
      if (statusCode !== undefined && (statusCode === 401 || statusCode === 403)) {
        // Check for token-related errors
        if (
          err.data?.error === 'invalid_token' ||
          err.data?.error === 'invalid_request' ||
          err.code === 'invalid_grant' ||
          message.includes('token') ||
          message.includes('unauthorized')
        ) {
          type = PlatformErrorType.INVALID_TOKEN;
        } else {
          type = PlatformErrorType.PERMISSION_DENIED;
        }
      } else if (statusCode !== undefined && statusCode === 429) {
        type = PlatformErrorType.RATE_LIMITED;
      } else if (statusCode !== undefined && statusCode >= 500) {
        type = PlatformErrorType.API_ERROR;
      } else if (
        err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT'
      ) {
        type = PlatformErrorType.NETWORK_ERROR;
      }
    }

    throw new PlatformError(type, message, error, statusCode);
  }
}
