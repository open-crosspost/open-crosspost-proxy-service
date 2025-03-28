import { ErrorType } from '../../middleware/errors';
import { ExtendedRequest } from '../../types/request.types';
import { Env } from '../../config/env';
import { NearAuthService } from '../../infrastructure/security/near-auth/near-auth.service';
import { NEAR_AUTH_HEADERS, NearAuthData } from '../../infrastructure/security/near-auth/near-auth.types';

/**
 * Auth Middleware
 * Handles authentication and authorization for API requests
 */
export class AuthMiddleware {
  private nearAuthService: NearAuthService;

  constructor(env: Env) {
    this.nearAuthService = new NearAuthService(env);
  }

  /**
   * Validate the NEAR authentication in the request
   * @param request The HTTP request
   * @returns Response if validation fails, void if successful
   */
  async validateNearAuth(request: ExtendedRequest): Promise<Response | void> {
    try {
      // Get NEAR auth data from headers
      const accountId = request.headers.get(NEAR_AUTH_HEADERS.ACCOUNT_ID);
      const publicKey = request.headers.get(NEAR_AUTH_HEADERS.PUBLIC_KEY);
      const signature = request.headers.get(NEAR_AUTH_HEADERS.SIGNATURE);
      const message = request.headers.get(NEAR_AUTH_HEADERS.MESSAGE);
      const nonce = request.headers.get(NEAR_AUTH_HEADERS.NONCE);
      
      // If any required header is missing, return a 401 Unauthorized response
      if (!accountId || !publicKey || !signature || !message || !nonce) {
        return new Response(JSON.stringify({
          error: {
            type: ErrorType.AUTHENTICATION,
            message: 'NEAR authentication headers are required',
            code: 'MISSING_NEAR_AUTH_HEADERS'
          }
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Create auth data object
      const authData: NearAuthData = {
        accountId,
        publicKey,
        signature,
        message,
        nonce
      };
      
      // Validate NEAR authentication
      const validationResult = await this.nearAuthService.validateNearAuth(authData);
      
      // If validation failed, return a 403 Forbidden response
      if (!validationResult.valid) {
        return new Response(JSON.stringify({
          error: {
            type: ErrorType.AUTHORIZATION,
            message: validationResult.error || 'Invalid NEAR authentication',
            code: 'INVALID_NEAR_AUTH'
          }
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Store the validated NEAR auth data in the request for later use
      request.nearAuth = authData;
      
      // Continue to the next middleware
    } catch (error) {
      console.error('Error validating NEAR authentication:', error);
      return new Response(JSON.stringify({
        error: {
          type: ErrorType.INTERNAL,
          message: 'Error validating NEAR authentication',
          code: 'NEAR_AUTH_VALIDATION_ERROR'
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Check if the NEAR account has the required permission
   * @param request The HTTP request
   * @param requiredPermission The required permission
   * @returns Response if check fails, void if successful
   */
  checkPermission(request: ExtendedRequest, requiredPermission: string): Response | void {
    // Get the NEAR auth data from the request
    const nearAuth = request.nearAuth;
    
    // If no NEAR auth data is found, return a 401 Unauthorized response
    if (!nearAuth) {
      return new Response(JSON.stringify({
        error: {
          type: ErrorType.AUTHENTICATION,
          message: 'NEAR authentication is required',
          code: 'MISSING_NEAR_AUTH'
        }
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // In a real implementation, you would check if the NEAR account has the required permission
    // For this example, we'll assume all authenticated NEAR accounts have all permissions
    
    // Continue to the next middleware
  }

  /**
   * Extract the user ID from the request
   * @param request The HTTP request
   * @returns Response if extraction fails, void if successful
   */
  extractUserId(request: ExtendedRequest): Response | void {
    // Get the user ID from the request headers
    const userId = request.headers.get('X-User-ID');

    // If no user ID is provided, return a 400 Bad Request response
    if (!userId) {
      return new Response(JSON.stringify({
        error: {
          type: ErrorType.VALIDATION,
          message: 'User ID is required',
          code: 'MISSING_USER_ID'
        }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Continue to the next middleware
  }

  /**
   * Combine multiple middleware functions
   * @param middlewares Array of middleware functions to execute
   * @returns Combined middleware function
   */
  static combine(...middlewares: ((request: ExtendedRequest, ...args: any[]) => Promise<Response | void> | Response | void)[]) {
    return async (request: ExtendedRequest, ...args: any[]): Promise<Response | void> => {
      for (const middleware of middlewares) {
        const result = await middleware(request, ...args);
        if (result instanceof Response) {
          return result;
        }
      }
    };
  }
}
