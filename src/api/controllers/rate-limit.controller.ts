import { RateLimitService } from '../../domain/services/rate-limit.service';
import { Env } from '../../config/env';
import { ExtendedRequest } from '../../types/request.types';
import { z } from 'zod';

/**
 * Rate Limit Controller
 * Handles HTTP requests for rate limit-related operations
 */
export class RateLimitController {
  private rateLimitService: RateLimitService;
  
  constructor(env: Env) {
    this.rateLimitService = new RateLimitService(env);
  }
  
  /**
   * Get rate limit status for a specific endpoint
   * @param request The HTTP request
   * @returns HTTP response with rate limit status
   */
  async getRateLimitStatus(request: ExtendedRequest): Promise<Response> {
    try {
      // Parse request body or query parameters
      const endpoint = request.params?.endpoint || 
                      request.query?.endpoint || 
                      new URL(request.url).searchParams.get('endpoint');
      
      const version = (request.params?.version || 
                      request.query?.version || 
                      new URL(request.url).searchParams.get('version') || 
                      'v2') as 'v1' | 'v2';
      
      if (!endpoint) {
        return new Response(JSON.stringify({ error: 'Endpoint is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Validate version
      if (version !== 'v1' && version !== 'v2') {
        return new Response(JSON.stringify({ error: 'Version must be v1 or v2' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Get rate limit status
      const rateLimitStatus = await this.rateLimitService.getRateLimitStatus(endpoint, version);
      
      // Return the rate limit status
      return this.rateLimitService.createResponse(rateLimitStatus);
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return this.rateLimitService.createErrorResponse(error, 500);
    }
  }
  
  /**
   * Get all rate limit statuses
   * @param request The HTTP request
   * @returns HTTP response with all rate limit statuses
   */
  async getAllRateLimits(): Promise<Response> {
    try {
      // Get all rate limits
      const rateLimits = await this.rateLimitService.getAllRateLimits();
      
      // Return all rate limits
      return this.rateLimitService.createResponse(rateLimits);
    } catch (error) {
      console.error('Error getting all rate limits:', error);
      return this.rateLimitService.createErrorResponse(error, 500);
    }
  }
  
  /**
   * Check if a rate limit has been hit
   * @param request The HTTP request
   * @returns HTTP response with rate limit status
   */
  async isRateLimited(request: ExtendedRequest): Promise<Response> {
    try {
      // Parse request body
      const body: any = await request.json().catch(() => ({}));
      
      // Validate request body
      const schema = z.object({
        rateLimitStatus: z.any()
      });
      
      const result = schema.safeParse(body);
      if (!result.success) {
        return new Response(JSON.stringify({ error: 'Invalid request body', details: result.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Check if rate limited
      const isRateLimited = this.rateLimitService.isRateLimited(result.data.rateLimitStatus);
      
      // Return rate limit status
      return this.rateLimitService.createResponse({ isRateLimited });
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return this.rateLimitService.createErrorResponse(error, 500);
    }
  }
  
  /**
   * Check if a rate limit status is obsolete
   * @param request The HTTP request
   * @returns HTTP response with obsolete status
   */
  async isRateLimitObsolete(request: ExtendedRequest): Promise<Response> {
    try {
      // Parse request body
      const body: any = await request.json().catch(() => ({}));
      
      // Validate request body
      const schema = z.object({
        rateLimitStatus: z.any()
      });
      
      const result = schema.safeParse(body);
      if (!result.success) {
        return new Response(JSON.stringify({ error: 'Invalid request body', details: result.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Check if rate limit is obsolete
      const isObsolete = this.rateLimitService.isRateLimitObsolete(result.data.rateLimitStatus);
      
      // Return obsolete status
      return this.rateLimitService.createResponse({ isObsolete });
    } catch (error) {
      console.error('Error checking if rate limit is obsolete:', error);
      return this.rateLimitService.createErrorResponse(error, 500);
    }
  }
}
