import { Env } from '../index';
import { BaseTwitterService } from './BaseTwitterService';
import { extractUserId } from '../middleware/auth';
import { Errors } from '../middleware/errors';
import { TwitterApi } from 'twitter-api-v2';

/**
 * Like Service
 * Handles like-related operations
 */
export class LikeService extends BaseTwitterService {
  constructor(env: Env) {
    super(env);
  }

  /**
   * Like a tweet
   */
  async likeTweet(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);
      
      // Get the tweet ID from the URL
      const url = new URL(request.url);
      const tweetId = url.pathname.split('/').pop();
      
      if (!tweetId) {
        throw Errors.validation('Tweet ID is required');
      }
      
      // Get a Twitter client with auto token refresher
      const userClient = await this.getTwitterClient(userId);
      
      // Like the tweet
      const result = await userClient.v2.like(userId, tweetId);
      
      return this.createJsonResponse(result);
    } catch (error) {
      console.error('Error liking tweet:', error);
      return this.handleTwitterError(error);
    }
  }

  /**
   * Unlike a tweet
   */
  async unlikeTweet(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);
      
      // Get the tweet ID from the URL
      const url = new URL(request.url);
      const tweetId = url.pathname.split('/').pop();
      
      if (!tweetId) {
        throw Errors.validation('Tweet ID is required');
      }
      
      // Get a Twitter client with auto token refresher
      const userClient = await this.getTwitterClient(userId);
      
      // Unlike the tweet
      const result = await userClient.v2.unlike(userId, tweetId);
      
      return this.createJsonResponse(result);
    } catch (error) {
      console.error('Error unliking tweet:', error);
      return this.handleTwitterError(error);
    }
  }
}
