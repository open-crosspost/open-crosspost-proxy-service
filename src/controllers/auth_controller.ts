import { Context } from "../../deps.ts";
import { getEnv } from "../config/env.ts";
import { DEFAULT_CONFIG } from "../config/index.ts";
import { AuthService } from "../domain/services/auth.service.ts";
import { NearAuthService } from "../infrastructure/security/near-auth/near-auth.service.ts";
import { NearAuthData, nearAuthDataSchema } from "../infrastructure/security/near-auth/near-auth.types.ts";

/**
 * Auth Controller
 * Handles HTTP requests for authentication-related operations
 */
export class AuthController {
  private authService: AuthService;

  constructor() {
    const env = getEnv();
    this.authService = new AuthService(env);
  }

  /**
   * Initialize authentication with NEAR signature
   * @param c The Hono context
   * @returns HTTP response with auth URL and state
   */
  async initializeAuth(c: Context): Promise<Response> {
    try {
      // Extract NEAR auth data from Authorization header
      const authHeader = c.req.header('Authorization');

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({
          error: {
            type: "validation_error",
            message: "Missing or invalid Authorization header",
            status: 400
          }
        }, 400);
      }

      // Extract the token part (after 'Bearer ')
      const token = authHeader.substring(7);

      // Parse the JSON token
      let authObject: NearAuthData;
      try {
        authObject = JSON.parse(token);
      } catch (error) {
        return c.json({
          error: {
            type: "validation_error",
            message: "Invalid JSON in Authorization token",
            status: 400
          }
        }, 400);
      }

      // Validate with Zod schema
      const zodValidationResult = nearAuthDataSchema.safeParse(authObject);

      if (!zodValidationResult.success) {
        return c.json({
          error: {
            type: "validation_error",
            message: "Missing required NEAR authentication data in token",
            details: zodValidationResult.error.format(),
            status: 400
          }
        }, 400);
      }

      // Use validated data with defaults applied
      const authData = {
        ...zodValidationResult.data,
        callback_url: zodValidationResult.data.callback_url || c.req.url // Use current URL as callback if not provided
      };

      // Initialize NEAR auth service
      const env = getEnv();
      const nearAuthService = new NearAuthService(env);

      // Validate signature
      const signatureValidationResult = await nearAuthService.validateNearAuth(authData);

      if (!signatureValidationResult.valid) {
        return c.json({
          error: {
            type: "authentication_error",
            message: `NEAR authentication failed: ${signatureValidationResult.error}`,
            status: 401
          }
        }, 401);
      }

      // Get the base URL of the current request
      const requestUrl = new URL(c.req.url);
      const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

      // Construct the callback URL (this is the proxy service's callback URL)
      const callbackUrl = `${baseUrl}/api/twitter/callback`;

      // Get successUrl and errorUrl from query parameters
      const successUrl = requestUrl.searchParams.get('successUrl');
      const errorUrl = requestUrl.searchParams.get('errorUrl');

      // Get the origin from the request headers as fallback
      const origin = c.req.header('origin') || c.req.header('referer') || requestUrl.origin;

      // Initialize auth with the proxy service's callback URL and the client's return URL
      // We need to pass the successUrl to the auth service so it can be stored in KV
      // and retrieved during the callback
      const twitterAuthData = await this.authService.initializeAuth(
        callbackUrl,
        DEFAULT_CONFIG.AUTH.DEFAULT_SCOPES,
        successUrl || origin,
        errorUrl || successUrl || origin
      );

      // Return the auth URL and state
      return c.json({ data: twitterAuthData });
    } catch (error) {
      console.error("Error initializing auth with NEAR:", error);
      return c.json({
        error: {
          type: "internal_error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
          status: 500
        }
      }, 500);
    }
  }

  /**
   * Handle the OAuth callback
   * @param c The Hono context
   * @returns HTTP response with user ID and tokens or a redirect
   */
  async handleCallback(c: Context): Promise<Response> {
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
          const callbackResult = await this.authService.getAuthState(state || '');
          if (callbackResult && callbackResult.errorUrl) {
            const errorRedirectUrl = new URL(callbackResult.errorUrl);
            errorRedirectUrl.searchParams.set('error', error);
            if (error_description) {
              errorRedirectUrl.searchParams.set('error_description', error_description);
            }
            return c.redirect(errorRedirectUrl.toString());
          }
        } catch (stateError) {
          console.error("Error retrieving auth state:", stateError);
        }

        return c.json({
          error: {
            type: "authentication_error",
            message: `Twitter authorization error: ${error}${error_description ? ` - ${error_description}` : ''}`,
            status: 400
          }
        }, 400);
      }

      if (!code || !state) {
        return c.json({
          error: {
            type: "validation_error",
            message: "Code and state are required",
            status: 400
          }
        }, 400);
      }

      const callbackResult = await this.authService.handleCallback(
        code,
        state
      );

      const { successUrl } = callbackResult;

      const redirectUrl = new URL(successUrl);

      redirectUrl.searchParams.set('userId', callbackResult.userId);
      redirectUrl.searchParams.set('success', 'true');

      return c.redirect(redirectUrl.toString());
    } catch (error) {
      console.error("Error handling callback:", error);
      return c.json({
        error: {
          type: "internal_error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
          status: 500
        }
      }, 500);
    }
  }

  /**
   * Refresh a user's access token
   * @param c The Hono context
   * @returns HTTP response with new tokens
   */
  async refreshToken(c: Context): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = c.get("userId") as string;

      // Refresh token
      const tokens = await this.authService.refreshToken(userId);

      // Return the new tokens
      return c.json({ data: tokens });
    } catch (error) {
      console.error("Error refreshing token:", error);
      return c.json({
        error: {
          type: "internal_error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
          status: 500
        }
      }, 500);
    }
  }

  /**
   * Revoke a user's tokens
   * @param c The Hono context
   * @returns HTTP response with success status
   */
  async revokeToken(c: Context): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = c.get("userId") as string;

      // Revoke token
      const success = await this.authService.revokeToken(userId);

      // Return success status
      return c.json({ data: { success } });
    } catch (error) {
      console.error("Error revoking token:", error);
      return c.json({
        error: {
          type: "internal_error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
          status: 500
        }
      }, 500);
    }
  }

  /**
   * Check if a user has valid tokens
   * @param c The Hono context
   * @returns HTTP response with validity status
   */
  async hasValidTokens(c: Context): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = c.get("userId") as string;

      // Check if user has valid tokens
      const hasTokens = await this.authService.hasValidTokens(userId);

      // Return validity status
      return c.json({ data: { hasTokens } });
    } catch (error) {
      console.error("Error checking tokens:", error);
      return c.json({
        error: {
          type: "internal_error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
          status: 500
        }
      }, 500);
    }
  }
}
