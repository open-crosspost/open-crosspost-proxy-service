import { BaseTwitterService } from '../services/TwitterService';
import { Env } from '../index';
import { ExtendedRequest } from '../types';

/**
 * Rate Limit Handler
 * Provides endpoints for checking rate limit status
 */
class RateLimitHandler extends BaseTwitterService {
  constructor(env: Env) {
    super(env);
  }

  /**
   * Get rate limit status for a specific endpoint
   * @param request The request object
   * @returns Response with rate limit information
   */
  async getRateLimitStatusHandler(request: ExtendedRequest): Promise<Response> {
    try {
      // Extract user ID from request
      const userId = request.headers.get('X-User-ID');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Extract endpoint from query parameters
      const url = new URL(request.url);
      const endpoint = url.searchParams.get('endpoint');
      if (!endpoint) {
        return new Response(JSON.stringify({ error: 'Endpoint parameter is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Extract version from query parameters (default to v2)
      const version = (url.searchParams.get('version') || 'v2') as 'v1' | 'v2';
      if (version !== 'v1' && version !== 'v2') {
        return new Response(JSON.stringify({ error: 'Version must be v1 or v2' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get rate limit status
      const rateLimitStatus = await super.getRateLimitStatus(endpoint, version);
      
      if (!rateLimitStatus) {
        return new Response(JSON.stringify({ 
          message: 'No rate limit information available for this endpoint',
          endpoint,
          version
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if rate limit is obsolete
      const isObsolete = this.isRateLimitObsolete(rateLimitStatus);
      
      // Check if rate limit has been hit
      const isLimited = this.isRateLimited(rateLimitStatus);

      // Return rate limit information
      return new Response(JSON.stringify({
        endpoint,
        version,
        rateLimit: rateLimitStatus,
        isObsolete,
        isLimited,
        resetAt: rateLimitStatus?.reset ? new Date(rateLimitStatus.reset * 1000).toISOString() : null,
        remainingRequests: rateLimitStatus?.remaining || 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return this.handleTwitterError(error);
    }
  }
}

// Create and export the rate limit routes
export const rateLimitRoutes = {
  getRateLimitStatus: (request: ExtendedRequest) => new RateLimitHandler(request.env).getRateLimitStatusHandler(request)
};
