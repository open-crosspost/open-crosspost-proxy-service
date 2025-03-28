import { Env } from '../../config/env';
import { ExtendedRequest } from '../../types/request.types';

/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing (CORS) for API requests
 */
export class CorsMiddleware {
  private allowedOrigins: string[];
  
  constructor(env: Env) {
    // Parse allowed origins from environment variable
    this.allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : [];
  }
  
  /**
   * Handle CORS preflight requests and add CORS headers to all responses
   * @param request The HTTP request
   * @returns Response for preflight requests, void for normal requests
   */
  handleCors(request: ExtendedRequest): Response | void {
    // Get the request origin
    const origin = request.headers.get('Origin') || '';
    
    // Check if the origin is allowed
    const isAllowed = this.isOriginAllowed(origin);
    
    // Set CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowed ? origin : '',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-User-ID',
      'Access-Control-Max-Age': '86400',
    };
    
    // Store CORS headers in the request for later use
    request.corsHeaders = corsHeaders;
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }
    
    // For actual requests, continue to the next middleware
  }
  
  /**
   * Add CORS headers to a response
   * @param response The response to add headers to
   * @param request The original request
   * @returns The response with CORS headers
   */
  addCorsHeaders(response: Response, request: ExtendedRequest): Response {
    const corsHeaders = request.corsHeaders || {};
    
    // Create a new response with the CORS headers
    const newResponse = new Response(response.body, response);
    
    // Add CORS headers to the response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value as string);
    });
    
    return newResponse;
  }
  
  /**
   * Check if an origin is allowed
   * @param origin The origin to check
   * @returns True if the origin is allowed
   */
  private isOriginAllowed(origin: string): boolean {
    // If no allowed origins are configured, deny all
    if (this.allowedOrigins.length === 0) {
      return false;
    }
    
    // Check if the origin is in the allowed list or if wildcard is allowed
    return this.allowedOrigins.includes(origin) || this.allowedOrigins.includes('*');
  }
}
