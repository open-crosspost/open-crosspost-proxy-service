import { Context } from "../deps.ts";
import { AuthService } from "../domain/services/auth.service.ts";
import { getEnv } from "../config/env.ts";
import { z } from "../deps.ts";
import { DEFAULT_CONFIG } from "../config/index.ts";
import { NearAuthService } from "../infrastructure/security/near-auth/near-auth.service.ts";
import { NEAR_AUTH_HEADERS, NearAuthData } from "../infrastructure/security/near-auth/near-auth.types.ts";

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
   * Initialize the authentication process
   * @param c The Hono context
   * @returns HTTP response with auth URL and state
   */
  async initializeAuth(c: Context): Promise<Response> {
    try {
      // Parse request body
      const body = await c.req.json().catch(() => ({}));
      
      // Validate request body
      const schema = z.object({
        returnUrl: z.string().url().optional(),
        scopes: z.array(z.string()).optional()
      });
      
      const result = schema.safeParse(body);
      if (!result.success) {
        return c.json({ 
          error: {
            type: "validation_error",
            message: "Invalid request body",
            details: result.error
          }
        }, 400);
      }
      
      // Get the base URL of the current request
      const requestUrl = new URL(c.req.url);
      const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
      
      // Construct the callback URL (this is the proxy service's callback URL)
      let callbackUrl = `${baseUrl}/api/twitter/callback`;
      
      // Add returnUrl as a query parameter if provided
      const { returnUrl, scopes = DEFAULT_CONFIG.AUTH.DEFAULT_SCOPES } = result.data;
      if (returnUrl) {
        callbackUrl = `${callbackUrl}?returnUrl=${encodeURIComponent(returnUrl)}`;
      }
      
      // Initialize auth with the proxy service's callback URL and the client's return URL
      const authData = await this.authService.initializeAuth(callbackUrl, scopes, returnUrl);
      
      // Return the auth URL and state
      return c.json({ data: authData });
    } catch (error) {
      console.error("Error initializing auth:", error);
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
      console.log("Auth controller handleCallback called");
      
      // Get the query parameters from the URL
      const url = new URL(c.req.url);
      console.log("Full callback URL:", url.toString());
      
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const error_description = url.searchParams.get('error_description');
      const returnUrl = url.searchParams.get('returnUrl');
      const nearAccountId = url.searchParams.get('nearAccountId');
      
      console.log("Callback params:", { 
        code: code ? "present" : "missing", 
        state: state ? "present" : "missing",
        error,
        error_description,
        returnUrl,
        nearAccountId
      });
      
      // Check for errors
      if (error) {
        // If returnUrl is provided, redirect with error
        if (returnUrl) {
          const redirectUrl = new URL(returnUrl);
          redirectUrl.searchParams.set('error', error);
          if (error_description) {
            redirectUrl.searchParams.set('error_description', error_description);
          }
          return c.redirect(redirectUrl.toString());
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
        // If returnUrl is provided, redirect with error
        if (returnUrl) {
          const redirectUrl = new URL(returnUrl);
          redirectUrl.searchParams.set('error', 'validation_error');
          redirectUrl.searchParams.set('error_description', 'Code and state are required');
          return c.redirect(redirectUrl.toString());
        }
        
        return c.json({
          error: {
            type: "validation_error",
            message: "Code and state are required",
            status: 400
          }
        }, 400);
      }
      
      // For compatibility with the existing interface, we need to pass these parameters
      // even though our updated implementation will retrieve them from KV
      const callbackResult = await this.authService.handleCallback(
        code,
        state,
        state, // savedState (not used in new implementation)
        "", // redirectUri (not used in new implementation)
        "" // codeVerifier (not used in new implementation)
      );
      
      // If nearAccountId is provided, associate the Twitter tokens with the NEAR account
      if (nearAccountId) {
        try {
          const env = getEnv();
          const nearAuthService = new NearAuthService(env);
          
          // Store the association between NEAR account and Twitter tokens
          await nearAuthService.storeToken(
            nearAccountId,
            'twitter',
            callbackResult.userId,
            callbackResult.tokens
          );
          
          console.log(`Associated Twitter account ${callbackResult.userId} with NEAR account ${nearAccountId}`);
        } catch (error) {
          console.error("Error associating Twitter account with NEAR account:", error);
          // Continue even if association fails
        }
      }
      
      // Use the clientReturnUrl from the callback result if available, otherwise use the returnUrl from the query parameters
      const finalReturnUrl = callbackResult.clientReturnUrl || returnUrl;
      
      // If returnUrl is provided, redirect with auth data
      if (finalReturnUrl) {
        console.log("Redirecting to:", finalReturnUrl);
        const redirectUrl = new URL(finalReturnUrl);
        redirectUrl.searchParams.set('userId', callbackResult.userId);
        
        // If we have a NEAR account ID, we don't need to send the tokens to the client
        if (nearAccountId) {
          redirectUrl.searchParams.set('nearAccountId', nearAccountId);
          redirectUrl.searchParams.set('success', 'true');
        } else {
          // Only send tokens if we're not using NEAR authentication
          redirectUrl.searchParams.set('accessToken', callbackResult.tokens.accessToken);
          if (callbackResult.tokens.refreshToken) {
            redirectUrl.searchParams.set('refreshToken', callbackResult.tokens.refreshToken);
          }
          if (callbackResult.tokens.expiresAt) {
            redirectUrl.searchParams.set('expiresAt', callbackResult.tokens.expiresAt.toString());
          }
        }
        
        return c.redirect(redirectUrl.toString());
      }
      
      // Return the user ID and tokens as JSON if no returnUrl
      return c.json({ data: callbackResult });
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
  
  /**
   * Initialize authentication with NEAR signature
   * @param c The Hono context
   * @returns HTTP response with auth URL and state
   */
  async initializeAuthWithNear(c: Context): Promise<Response> {
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
      
      // Check if all required fields are present
      if (!authObject.account_id || !authObject.public_key || !authObject.signature || 
          !authObject.message || !authObject.nonce) {
            console.log("authObject", authObject);
        return c.json({
          error: {
            type: "validation_error",
            message: "Missing required NEAR authentication data in token",
            status: 400
          }
        }, 400);
      }
      
      // Set default values if not provided
      const authData: NearAuthData = {
        ...authObject,
        recipient: authObject.recipient || 'crosspost.near', // Default recipient
        callback_url: authObject.callback_url || c.req.url // Use current URL as callback if not provided
      };
      
      // Parse request body
      const body = await c.req.json().catch(() => ({}));
      
      // Validate request body
      const schema = z.object({
        returnUrl: z.string().url().optional()
      });
      
      const result = schema.safeParse(body);
      if (!result.success) {
        return c.json({ 
          error: {
            type: "validation_error",
            message: "Invalid request body",
            details: result.error
          }
        }, 400);
      }
      
      // Initialize NEAR auth service
      const env = getEnv();
      const nearAuthService = new NearAuthService(env);
      
      // Validate signature
      const validationResult = await nearAuthService.validateNearAuth(authData);
      console.log("VALIDATED!!!!", validationResult.valid)
      
      if (!validationResult.valid) {
        return c.json({
          error: {
            type: "authentication_error",
            message: `NEAR authentication failed: ${validationResult.error}`,
            status: 401
          }
        }, 401);
      }
      
      // Get the base URL of the current request
      const requestUrl = new URL(c.req.url);
      const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
      
      // Construct the callback URL (this is the proxy service's callback URL)
      let callbackUrl = `${baseUrl}/api/twitter/callback`;
      
      // Add returnUrl and nearAccountId as query parameters
      const { returnUrl } = result.data;
      const callbackParams = new URLSearchParams();
      
      if (returnUrl) {
        callbackParams.set('returnUrl', returnUrl);
        console.log("Setting returnUrl in callback params:", returnUrl);
      } else {
        console.log("No returnUrl provided in request body");
        
      // Try to get the origin from the request headers
      const requestOrigin = c.req.header('origin') || c.req.header('referer');
      if (requestOrigin) {
        callbackParams.set('returnUrl', requestOrigin);
        console.log("Using origin as returnUrl:", requestOrigin);
      }
      }
      
      callbackParams.set('nearAccountId', authObject.account_id);
      
      callbackUrl = `${callbackUrl}?${callbackParams.toString()}`;
      console.log("Final callback URL:", callbackUrl);
      
      // Get the origin from the request headers
      const origin = c.req.header('origin') || c.req.header('referer');
      
      // Initialize auth with the proxy service's callback URL and the client's return URL
      // We need to pass the returnUrl to the auth service so it can be stored in KV
      // and retrieved during the callback
      const twitterAuthData = await this.authService.initializeAuth(
        callbackUrl,
        DEFAULT_CONFIG.AUTH.DEFAULT_SCOPES,
        returnUrl || (origin ? origin : requestUrl.origin)
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
}
