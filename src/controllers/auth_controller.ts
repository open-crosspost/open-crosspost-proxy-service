import { Context } from '../../deps.ts';
import { Env, getEnv } from '../config/env.ts';
import { DEFAULT_CONFIG } from '../config/index.ts';
import { AuthService } from '../domain/services/auth.service.ts';
import { NearAuthService } from '../infrastructure/security/near-auth/near-auth.service.ts';
import { extractAndValidateNearAuth } from '../utils/near-auth.utils.ts';
import { unlinkAccountFromNear } from '../utils/account-linking.utils.ts';

/**
 * Auth Controller
 * Handles HTTP requests for authentication-related operations
 */
export class AuthController {
  private authService: AuthService;
  private nearAuthService: NearAuthService;
  private env: Env;

  constructor() {
    this.env = getEnv();
    this.authService = new AuthService(this.env);
    this.nearAuthService = new NearAuthService(this.env);
  }

  /**
   * Initialize authentication with NEAR signature
   * @param c The Hono context
   * @param platform The platform name (e.g., 'twitter')
   * @returns HTTP response with auth URL and state
   */
  async initializeAuth(c: Context, platform: string): Promise<Response> {
    try {
      // Extract and validate NEAR auth data
      const { signerId } = await extractAndValidateNearAuth(c);

      // Get the base URL of the current request
      const requestUrl = new URL(c.req.url);
      const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

      // Construct the platform-specific callback URL
      const callbackUrl = `${baseUrl}/auth/${platform}/callback`;

      // Get successUrl and errorUrl from query parameters
      const successUrl = requestUrl.searchParams.get('successUrl');
      const errorUrl = requestUrl.searchParams.get('errorUrl');

      // Get the origin from the request headers as fallback
      const origin = c.req.header('origin') || c.req.header('referer') || requestUrl.origin;

      // Initialize auth with the platform-specific callback URL and the client's return URL
      // We need to pass the successUrl to the auth service so it can be stored in KV
      // and retrieved during the callback
      const authData = await this.authService.initializeAuth(
        platform,
        signerId, // Pass the NEAR account ID for linking during callback
        callbackUrl,
        DEFAULT_CONFIG.AUTH.DEFAULT_SCOPES,
        successUrl || origin,
        errorUrl || successUrl || origin,
      );

      // Return the auth URL and state
      return c.json({ data: authData });
    } catch (error) {
      console.error('Error initializing auth with NEAR:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }

  /**
   * Handle the OAuth callback
   * @param c The Hono context
   * @param platform The platform name (e.g., 'twitter')
   * @returns HTTP response with user ID and tokens or a redirect
   */
  async handleCallback(c: Context, platform: string): Promise<Response> {
    try {
      // Get the query parameters from the URL
      const url = new URL(c.req.url);

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const error_description = url.searchParams.get('error_description');

      // Check for errors
      if (error) {
        try {
          const callbackResult = await this.authService.getAuthState(platform, state || '');
          if (callbackResult && callbackResult.errorUrl) {
            const errorRedirectUrl = new URL(callbackResult.errorUrl);
            errorRedirectUrl.searchParams.set('error', error);
            if (error_description) {
              errorRedirectUrl.searchParams.set('error_description', error_description);
            }
            return c.redirect(errorRedirectUrl.toString());
          }
        } catch (stateError) {
          console.error('Error retrieving auth state:', stateError);
        }

        return c.json({
          error: {
            type: 'authentication_error',
            message: `Twitter authorization error: ${error}${
              error_description ? ` - ${error_description}` : ''
            }`,
            status: 400,
          },
        }, 400);
      }

      if (!code || !state) {
        return c.json({
          error: {
            type: 'validation_error',
            message: 'Code and state are required',
            status: 400,
          },
        }, 400);
      }

      const callbackResult = await this.authService.handleCallback(
        platform,
        code,
        state,
      );

      const { successUrl } = callbackResult;

      const redirectUrl = new URL(successUrl);

      redirectUrl.searchParams.set('userId', callbackResult.userId);
      redirectUrl.searchParams.set('success', 'true');

      return c.redirect(redirectUrl.toString());
    } catch (error) {
      console.error('Error handling callback:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }

  /**
   * Refresh a user's access token
   * @param c The Hono context
   * @param platform The platform name (e.g., 'twitter')
   * @returns HTTP response with new tokens
   */
  async refreshToken(c: Context, platform: string): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const { signerId } = await extractAndValidateNearAuth(c);

      // Extract userId from request body
      const body = await c.req.json();
      const { userId } = body;

      if (!userId) {
        return c.json({
          error: {
            type: 'validation_error',
            message: 'userId is required',
            status: 400,
          },
        }, 400);
      }

      // Refresh token
      const tokens = await this.authService.refreshToken(platform, userId);

      // Update the token in NEAR auth service
      await this.nearAuthService.storeToken(signerId, platform, userId, tokens);

      // Return the new tokens
      return c.json({ data: tokens });
    } catch (error) {
      console.error('Error refreshing token:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }

  /**
   * Revoke a user's tokens
   * @param c The Hono context
   * @param platform The platform name (e.g., 'twitter')
   * @returns HTTP response with success status
   */
  async revokeToken(c: Context, platform: string): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const { signerId } = await extractAndValidateNearAuth(c);

      // Extract userId from request body
      const body = await c.req.json();
      const { userId } = body;

      if (!userId) {
        return c.json({
          error: {
            type: 'validation_error',
            message: 'userId is required',
            status: 400,
          },
        }, 400);
      }

      // Revoke token
      const success = await this.authService.revokeToken(platform, userId);

      // Unlink the account from the NEAR wallet
      if (success) {
        await unlinkAccountFromNear(signerId, platform, userId, this.env);
      }

      // Return success status
      return c.json({ data: { success } });
    } catch (error) {
      console.error('Error revoking token:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }

  /**
   * Check if a user has valid tokens
   * @param c The Hono context
   * @param platform The platform name (e.g., 'twitter')
   * @returns HTTP response with validity status
   */
  async hasValidTokens(c: Context, platform: string): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const { signerId } = await extractAndValidateNearAuth(c);

      // Extract userId from request body or query parameters
      let userId = c.req.query('userId');

      // If not in query parameters, try to get from request body
      if (!userId) {
        try {
          const body = await c.req.json();
          userId = body.userId;
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }

      if (!userId) {
        return c.json({
          error: {
            type: 'validation_error',
            message: 'userId is required',
            status: 400,
          },
        }, 400);
      }

      // Check if user has valid tokens
      const hasTokens = await this.authService.hasValidTokens(platform, userId);

      // Also check if the tokens are linked to this NEAR account
      const token = await this.nearAuthService.getToken(signerId, platform, userId);
      const isLinked = !!token;

      // Return validity status
      return c.json({ data: { hasTokens, isLinked } });
    } catch (error) {
      console.error('Error checking tokens:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }

  /**
   * List all connected accounts for a NEAR wallet
   * @param c The Hono context
   * @returns HTTP response with connected accounts
   */
  async listConnectedAccounts(c: Context): Promise<Response> {
    try {
      // Extract NEAR account ID from the validated signature
      const { signerId } = await extractAndValidateNearAuth(c);

      // Get all connected accounts
      const accounts = await this.nearAuthService.listConnectedAccounts(signerId);

      // Return the accounts
      return c.json({ data: { accounts } });
    } catch (error) {
      console.error('Error listing connected accounts:', error);
      return c.json({
        error: {
          type: 'internal_error',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          status: 500,
        },
      }, 500);
    }
  }
}
