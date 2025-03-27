import { Env } from '../index';
import { BaseTwitterService } from './BaseTwitterService';
import { extractUserId } from '../middleware/auth';
import { TwitterApi } from 'twitter-api-v2';

/**
 * Timeline Service
 * Handles timeline-related operations
 */
export class TimelineService extends BaseTwitterService {
  constructor(env: Env) {
    super(env);
  }

  /**
   * Get a user's timeline
   */
  async getUserTimeline(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);
      
      // Get query parameters
      const url = new URL(request.url);
      const count = url.searchParams.get('count') || '20';
      const sinceId = url.searchParams.get('since_id') || undefined;
      const maxId = url.searchParams.get('max_id') || undefined;
      
      // Get a Twitter client with auto token refresher
      const userClient = await this.getTwitterClient(userId);
      
      // Get the timeline
      const result = await userClient.v2.userTimeline(userId, {
        max_results: parseInt(count, 10),
        since_id: sinceId,
        until_id: maxId,
        expansions: ['attachments.media_keys', 'author_id', 'referenced_tweets.id'],
        'tweet.fields': ['created_at', 'public_metrics', 'text', 'entities'],
        'user.fields': ['name', 'profile_image_url', 'username'],
        'media.fields': ['url', 'preview_image_url', 'type']
      });
      
      return this.createJsonResponse(result);
    } catch (error) {
      console.error('Error getting timeline:', error);
      return this.handleTwitterError(error);
    }
  }

  /**
   * Get a user's mentions
   */
  async getUserMentions(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);
      
      // Get query parameters
      const url = new URL(request.url);
      const count = url.searchParams.get('count') || '20';
      const sinceId = url.searchParams.get('since_id') || undefined;
      const maxId = url.searchParams.get('max_id') || undefined;
      
      // Get a Twitter client with auto token refresher
      const userClient = await this.getTwitterClient(userId);
      
      // Get the mentions
      const result = await userClient.v2.userMentionTimeline(userId, {
        max_results: parseInt(count, 10),
        since_id: sinceId,
        until_id: maxId,
        expansions: ['attachments.media_keys', 'author_id', 'referenced_tweets.id'],
        'tweet.fields': ['created_at', 'public_metrics', 'text', 'entities'],
        'user.fields': ['name', 'profile_image_url', 'username'],
        'media.fields': ['url', 'preview_image_url', 'type']
      });
      
      return this.createJsonResponse(result);
    } catch (error) {
      console.error('Error getting mentions:', error);
      return this.handleTwitterError(error);
    }
  }

  /**
   * Get a user's liked tweets
   */
  async getUserLikes(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);
      
      // Get query parameters
      const url = new URL(request.url);
      const count = url.searchParams.get('count') || '20';
      
      // Get a Twitter client with auto token refresher
      const userClient = await this.getTwitterClient(userId);
      
      // Get the liked tweets
      const result = await userClient.v2.userLikedTweets(userId, {
        max_results: parseInt(count, 10),
        expansions: ['attachments.media_keys', 'author_id', 'referenced_tweets.id'],
        'tweet.fields': ['created_at', 'public_metrics', 'text', 'entities'],
        'user.fields': ['name', 'profile_image_url', 'username'],
        'media.fields': ['url', 'preview_image_url', 'type']
      });
      
      return this.createJsonResponse(result);
    } catch (error) {
      console.error('Error getting liked tweets:', error);
      return this.handleTwitterError(error);
    }
  }

  /**
   * Get a tweet by ID
   */
  async getTweet(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);
      
      // Get the tweet ID from the URL
      const url = new URL(request.url);
      const tweetId = url.pathname.split('/').pop();
      
      if (!tweetId) {
        throw new Error('Tweet ID is required');
      }
      
      // Get a Twitter client with auto token refresher
      const userClient = await this.getTwitterClient(userId);
      
      // Get the tweet
      const result = await userClient.v2.singleTweet(tweetId, {
        expansions: ['attachments.media_keys', 'author_id', 'referenced_tweets.id'],
        'tweet.fields': ['created_at', 'public_metrics', 'text', 'entities'],
        'user.fields': ['name', 'profile_image_url', 'username'],
        'media.fields': ['url', 'preview_image_url', 'type']
      });
      
      return this.createJsonResponse(result);
    } catch (error) {
      console.error('Error getting tweet:', error);
      return this.handleTwitterError(error);
    }
  }
}
