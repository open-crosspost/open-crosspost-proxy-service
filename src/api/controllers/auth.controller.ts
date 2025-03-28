import { AuthService } from '../../domain/services/auth.service';
import { Env } from '../../config/env';
import { ExtendedRequest } from '../../types/request.types';
import { z } from 'zod';
import { DEFAULT_CONFIG } from '../../config';

/**
 * Auth Controller
 * Handles HTTP requests for authentication-related operations
 */
export class AuthController {
  private authService: AuthService;
  
  constructor(env: Env) {
    this.authService = new AuthService(env);
  }
  
  /**
   * Initialize the authentication process
   * @param request The HTTP request
   * @returns HTTP response with auth URL and state
   */
  async initializeAuth(request: ExtendedRequest): Promise<Response> {
    try {
      // Parse request body
      const body: any = await request.json().catch(() => ({}));
      
      // Validate request body
      const schema = z.object({
        redirectUri: z.string().url(),
        scopes: z.array(z.string()).optional()
      });
      
      const result = schema.safeParse(body);
      if (!result.success) {
        return new Response(JSON.stringify({ error: 'Invalid request body', details: result.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Initialize auth
      const { redirectUri, scopes = DEFAULT_CONFIG.AUTH.DEFAULT_SCOPES } = result.data;
      const authData = await this.authService.initializeAuth(redirectUri, scopes);
      
      // Return the auth URL and state
      return this.authService.createResponse(authData);
    } catch (error) {
      console.error('Error initializing auth:', error);
      return this.authService.createErrorResponse(error, 500);
    }
  }
  
  /**
   * Handle the OAuth callback
   * @param request The HTTP request
   * @returns HTTP response with user ID and tokens
   */
  async handleCallback(request: ExtendedRequest): Promise<Response> {
    try {
      // Parse request body
      const body: any = await request.json().catch(() => ({}));
      
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
        return new Response(JSON.stringify({ error: 'Invalid request body', details: result.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
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
      return this.authService.createResponse(callbackResult);
    } catch (error) {
      console.error('Error handling callback:', error);
      return this.authService.createErrorResponse(error, 500);
    }
  }
  
  /**
   * Refresh a user's access token
   * @param request The HTTP request
   * @returns HTTP response with new tokens
   */
  async refreshToken(request: ExtendedRequest): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = request.headers.get('X-User-ID');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Refresh token
      const tokens = await this.authService.refreshToken(userId);
      
      // Return the new tokens
      return this.authService.createResponse(tokens);
    } catch (error) {
      console.error('Error refreshing token:', error);
      return this.authService.createErrorResponse(error, 500);
    }
  }
  
  /**
   * Revoke a user's tokens
   * @param request The HTTP request
   * @returns HTTP response with success status
   */
  async revokeToken(request: ExtendedRequest): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = request.headers.get('X-User-ID');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Revoke token
      const success = await this.authService.revokeToken(userId);
      
      // Return success status
      return this.authService.createResponse({ success });
    } catch (error) {
      console.error('Error revoking token:', error);
      return this.authService.createErrorResponse(error, 500);
    }
  }
  
  /**
   * Check if a user has valid tokens
   * @param request The HTTP request
   * @returns HTTP response with validity status
   */
  async hasValidTokens(request: ExtendedRequest): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = request.headers.get('X-User-ID');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Check if user has valid tokens
      const hasTokens = await this.authService.hasValidTokens(userId);
      
      // Return validity status
      return this.authService.createResponse({ hasTokens });
    } catch (error) {
      console.error('Error checking tokens:', error);
      return this.authService.createErrorResponse(error, 500);
    }
  }
}
