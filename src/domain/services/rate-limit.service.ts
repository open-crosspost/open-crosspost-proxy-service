import { TwitterClient } from '../../infrastructure/platform/twitter/twitter-client.ts';
import { Env } from '../../config/env.ts';
import { createApiResponse, createErrorResponse } from '../../types/response.types.ts';

/**
 * Rate Limit Service
 * Domain service for rate limit-related operations
 */
export class RateLimitService {
  private twitterClient: TwitterClient;
  
  constructor(env: Env) {
    // For now, we only support Twitter
    this.twitterClient = new TwitterClient(env);
  }
  
  /**
   * Get the rate limit status for a specific endpoint
   * @param endpoint The endpoint to check rate limits for
   * @param version The API version (v1 or v2)
   * @returns The rate limit status
   */
  async getRateLimitStatus(endpoint: string, version: 'v1' | 'v2' = 'v2'): Promise<any> {
    try {
      return await this.twitterClient.getRateLimitStatus(endpoint, version);
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      throw error;
    }
  }
  
  /**
   * Check if a rate limit has been hit
   * @param rateLimitStatus The rate limit status object
   * @returns True if the rate limit has been hit
   */
  isRateLimited(rateLimitStatus: any): boolean {
    if (!rateLimitStatus) return false;
    return this.twitterClient.isRateLimited(rateLimitStatus);
  }
  
  /**
   * Check if a rate limit status is obsolete (reset time has passed)
   * @param rateLimitStatus The rate limit status object
   * @returns True if the rate limit status is obsolete
   */
  isRateLimitObsolete(rateLimitStatus: any): boolean {
    if (!rateLimitStatus) return true;
    return this.twitterClient.isRateLimitObsolete(rateLimitStatus);
  }
  
  /**
   * Get all rate limit statuses
   * @returns All rate limit statuses
   */
  async getAllRateLimits(): Promise<any> {
    try {
      // Common endpoints to check
      const endpoints = {
        v2: [
          '/2/tweets',
          '/2/users/me',
          '/2/users/:id/tweets',
          '/2/users/:id/likes',
          '/2/users/:id/retweets'
        ],
        v1: [
          'statuses/update',
          'statuses/retweet/:id',
          'favorites/create',
          'favorites/destroy',
          'media/upload'
        ]
      };
      
      const rateLimits: any = {
        v2: {},
        v1: {}
      };
      
      // Get rate limits for v2 endpoints
      for (const endpoint of endpoints.v2) {
        rateLimits.v2[endpoint] = await this.getRateLimitStatus(endpoint, 'v2');
      }
      
      // Get rate limits for v1 endpoints
      for (const endpoint of endpoints.v1) {
        rateLimits.v1[endpoint] = await this.getRateLimitStatus(endpoint, 'v1');
      }
      
      return rateLimits;
    } catch (error) {
      console.error('Error getting all rate limits:', error);
      throw error;
    }
  }
  
  /**
   * Create a standard API response
   * @param data The response data
   * @returns A standard API response
   */
  createResponse(data: any): Response {
    return new Response(JSON.stringify(createApiResponse(data)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  /**
   * Create an error response
   * @param error The error object
   * @param status The response status
   * @returns An error response
   */
  createErrorResponse(error: any, status = 500): Response {
    const errorMessage = error.message || 'An unexpected error occurred';
    const errorType = error.type || 'INTERNAL_ERROR';
    
    return new Response(JSON.stringify(createErrorResponse(errorType, errorMessage, error.code, error.details)), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
