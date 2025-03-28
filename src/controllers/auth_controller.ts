import { Context } from "../deps.ts";
import { AuthService } from "../domain/services/auth.service.ts";
import { getEnv } from "../config/env.ts";
import { z } from "../deps.ts";
import { DEFAULT_CONFIG } from "../config/index.ts";

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
        redirectUri: z.string().url(),
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
      
      // Initialize auth
      const { redirectUri, scopes = DEFAULT_CONFIG.AUTH.DEFAULT_SCOPES } = result.data;
      const authData = await this.authService.initializeAuth(redirectUri, scopes);
      
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
   * @returns HTTP response with user ID and tokens
   */
  async handleCallback(c: Context): Promise<Response> {
    try {
      // Parse request body
      const body = await c.req.json().catch(() => ({}));
      
      // Validate request body
      const schema = z.object({
        code: z.string(),
        state: z.string(),
        savedState: z.string(),
        redirectUri: z.string().url(),
        codeVerifier: z.string().optional()
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
      
      // Handle callback
      const { code, state, savedState, redirectUri, codeVerifier } = result.data;
      const callbackResult = await this.authService.handleCallback(
        code,
        state,
        savedState,
        redirectUri,
        codeVerifier
      );
      
      // Return the user ID and tokens
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
}
