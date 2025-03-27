import { Env } from '../index';
import { TweetService } from '../services/TweetService';
import { LikeService } from '../services/LikeService';

/**
 * Tweet handlers
 */
export const tweetRoutes = {
  /**
   * Unified tweet handler
   * Handles all tweet types (regular, reply, quote, thread) with media
   */
  async unifiedTweet(request: Request): Promise<Response> {
    // Get the environment from the request
    const env = (request as any).env as Env;
    
    // Create a Tweet service instance
    const tweetService = new TweetService(env);
    
    // Use the unified tweet method
    return await tweetService.unifiedTweet(request);
  },
  /**
   * Post a new tweet
   */
  async postTweet(request: Request): Promise<Response> {
    // Get the environment from the request
    const env = (request as any).env as Env;
    
    // Create a Tweet service instance
    const tweetService = new TweetService(env);
    
    // Post the tweet
    return await tweetService.tweet(request);
  },
  
  /**
   * Retweet an existing tweet
   */
  async retweet(request: Request): Promise<Response> {
    // Get the environment from the request
    const env = (request as any).env as Env;
    
    // Create a Tweet service instance
    const tweetService = new TweetService(env);
    
    // Retweet the tweet
    return await tweetService.retweet(request);
  },
  
  /**
   * Quote tweet an existing tweet
   */
  async quoteTweet(request: Request): Promise<Response> {
    // Get the environment from the request
    const env = (request as any).env as Env;
    
    // Create a Tweet service instance
    const tweetService = new TweetService(env);
    
    // Quote tweet
    return await tweetService.quoteTweet(request);
  },
  
  /**
   * Delete a tweet
   */
  async deleteTweet(request: Request): Promise<Response> {
    // Get the environment from the request
    const env = (request as any).env as Env;
    
    // Create a Tweet service instance
    const tweetService = new TweetService(env);
    
    // Delete the tweet
    return await tweetService.deleteTweet(request);
  },
  
  /**
   * Like a tweet
   */
  async likeTweet(request: Request): Promise<Response> {
    // Get the environment from the request
    const env = (request as any).env as Env;
    
    // Create a Like service instance
    const likeService = new LikeService(env);
    
    // Like the tweet
    return await likeService.likeTweet(request);
  },
  
  /**
   * Unlike a tweet
   */
  async unlikeTweet(request: Request): Promise<Response> {
    // Get the environment from the request
    const env = (request as any).env as Env;
    
    // Create a Like service instance
    const likeService = new LikeService(env);
    
    // Unlike the tweet
    return await likeService.unlikeTweet(request);
  },
  
  /**
   * Reply to a tweet
   */
  async replyToTweet(request: Request): Promise<Response> {
    // Get the environment from the request
    const env = (request as any).env as Env;
    
    // Create a Tweet service instance
    const tweetService = new TweetService(env);
    
    // Reply to the tweet
    return await tweetService.replyToTweet(request);
  },
};
