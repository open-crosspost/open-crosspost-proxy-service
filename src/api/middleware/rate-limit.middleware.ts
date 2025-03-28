import { Env } from '../../config/env';
import { ExtendedRequest } from '../../types/request.types';
import { RateLimitService } from '../../domain/services/rate-limit.service';
import { ErrorType, Errors } from '../../middleware/errors';

/**
 * Rate Limit Middleware
 * Handles rate limiting for API requests
 */
export class RateLimitMiddleware {
  private rateLimitService: RateLimitService;
  
  // In-memory rate limit tracking (would be replaced with D1 or Redis in production)
  private static rateLimits: Map<string, {
    count: number;
    resetAt: number;
    limit: number;
  }> = new Map();
  
  constructor(env: Env) {
    this.rateLimitService = new RateLimitService(env);
  }
  
  /**
   * Check rate limits for a request
   * @param request The HTTP request
   * @param endpoint The endpoint being accessed
   * @param limit The rate limit (requests per minute)
   * @returns Response if rate limited, void if not
   */
  checkRateLimit(request: ExtendedRequest, endpoint: string, limit = 60): Response | void {
    try {
      // Get the API key from the request
      const apiKey = request.apiKey;
      
      // If no API key is found, use IP address as identifier
      const identifier = apiKey?.id || request.headers.get('CF-Connecting-IP') || 'unknown';
      
      // Create a unique key for this endpoint and identifier
      const key = `${identifier}:${endpoint}`;
      
      // Get the current time
      const now = Date.now();
      
      // Get the current rate limit data
      let rateLimitData = RateLimitMiddleware.rateLimits.get(key);
      
      // If no rate limit data exists or it has expired, create a new one
      if (!rateLimitData || rateLimitData.resetAt < now) {
        rateLimitData = {
          count: 0,
          resetAt: now + 60000, // Reset after 1 minute
          limit
        };
      }
      
      // Increment the request count
      rateLimitData.count++;
      
      // Update the rate limit data
      RateLimitMiddleware.rateLimits.set(key, rateLimitData);
      
      // Check if the rate limit has been exceeded
      if (rateLimitData.count > rateLimitData.limit) {
        // Calculate the time until reset
        const retryAfter = Math.ceil((rateLimitData.resetAt - now) / 1000);
        
        // Return a 429 Too Many Requests response
        return new Response(JSON.stringify({ 
          error: {
            type: ErrorType.RATE_LIMIT,
            message: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            details: {
              retryAfter,
              limit: rateLimitData.limit,
              remaining: 0,
              reset: Math.floor(rateLimitData.resetAt / 1000)
            }
          }
        }), { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-Rate-Limit-Limit': rateLimitData.limit.toString(),
            'X-Rate-Limit-Remaining': '0',
            'X-Rate-Limit-Reset': Math.floor(rateLimitData.resetAt / 1000).toString()
          }
        });
      }
      
      // Add rate limit headers to the request for later use
      request.rateLimitHeaders = {
        'X-Rate-Limit-Limit': rateLimitData.limit.toString(),
        'X-Rate-Limit-Remaining': (rateLimitData.limit - rateLimitData.count).toString(),
        'X-Rate-Limit-Reset': Math.floor(rateLimitData.resetAt / 1000).toString()
      };
      
      // Continue to the next middleware
    } catch (error) {
      console.error('Error checking rate limit:', error);
      // If there's an error, allow the request to proceed
      // This prevents rate limiting from blocking requests if there's an issue
    }
  }
  
  /**
   * Add rate limit headers to a response
   * @param response The response to add headers to
   * @param request The original request
   * @returns The response with rate limit headers
   */
  addRateLimitHeaders(response: Response, request: ExtendedRequest): Response {
    const rateLimitHeaders = request.rateLimitHeaders || {};
    
    // Create a new response with the rate limit headers
    const newResponse = new Response(response.body, response);
    
    // Add rate limit headers to the response
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value as string);
    });
    
    return newResponse;
  }
  
  /**
   * Check Twitter API rate limits
   * @param request The HTTP request
   * @param endpoint The Twitter API endpoint
   * @param version The API version (v1 or v2)
   * @returns Response if rate limited, void if not
   */
  async checkTwitterRateLimit(
    request: ExtendedRequest, 
    endpoint: string, 
    version: 'v1' | 'v2' = 'v2'
  ): Promise<Response | void> {
    try {
      // Get rate limit status for the endpoint
      const rateLimitStatus = await this.rateLimitService.getRateLimitStatus(endpoint, version);
      
      // Check if the rate limit has been hit
      if (this.rateLimitService.isRateLimited(rateLimitStatus)) {
        // Calculate the time until reset
        const now = Math.floor(Date.now() / 1000);
        const resetAt = rateLimitStatus.reset;
        const retryAfter = Math.max(1, resetAt - now);
        
        // Return a 429 Too Many Requests response
        return new Response(JSON.stringify({ 
          error: {
            type: ErrorType.RATE_LIMIT,
            message: 'Twitter API rate limit exceeded',
            code: 'TWITTER_RATE_LIMIT_EXCEEDED',
            details: {
              retryAfter,
              limit: rateLimitStatus.limit,
              remaining: rateLimitStatus.remaining,
              reset: resetAt
            }
          }
        }), { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-Rate-Limit-Limit': rateLimitStatus.limit.toString(),
            'X-Rate-Limit-Remaining': rateLimitStatus.remaining.toString(),
            'X-Rate-Limit-Reset': resetAt.toString()
          }
        });
      }
      
      // Add Twitter rate limit headers to the request for later use
      request.twitterRateLimitHeaders = {
        'X-Twitter-Rate-Limit-Limit': rateLimitStatus.limit.toString(),
        'X-Twitter-Rate-Limit-Remaining': rateLimitStatus.remaining.toString(),
        'X-Twitter-Rate-Limit-Reset': rateLimitStatus.reset.toString()
      };
      
      // Continue to the next middleware
    } catch (error) {
      console.error('Error checking Twitter rate limit:', error);
      // If there's an error, allow the request to proceed
      // This prevents rate limiting from blocking requests if there's an issue
    }
  }
  
  /**
   * Add Twitter rate limit headers to a response
   * @param response The response to add headers to
   * @param request The original request
   * @returns The response with Twitter rate limit headers
   */
  addTwitterRateLimitHeaders(response: Response, request: ExtendedRequest): Response {
    const twitterRateLimitHeaders = request.twitterRateLimitHeaders || {};
    
    // Create a new response with the Twitter rate limit headers
    const newResponse = new Response(response.body, response);
    
    // Add Twitter rate limit headers to the response
    Object.entries(twitterRateLimitHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value as string);
    });
    
    return newResponse;
  }
}
