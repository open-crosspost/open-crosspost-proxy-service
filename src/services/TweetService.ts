import { SendTweetV2Params } from 'twitter-api-v2';
import { Env } from '../index';
import { extractUserId } from '../middleware/auth';
import { Errors } from '../middleware/errors';
import { BaseTwitterService } from './TwitterService';
import { MediaService } from './MediaService';
import { ExtendedRequest } from '../types';

/**
 * Media file interface
 */
interface MediaFile {
  data: Blob | string;
  mimeType?: string;
  alt_text?: string;
}

/**
 * Tweet Service
 * Handles tweet-related operations
 */
export class TweetService extends BaseTwitterService {
  constructor(env: Env) {
    super(env);
  }

  /**
   * Post a tweet or thread
   * Handles both single tweets and threads with media uploads
   */
  async tweet(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);
      const env = (request as ExtendedRequest).env;
      
      // Define interfaces for request body types
      interface TweetWithMediaIds {
        text?: string;
        media_ids?: string[];
      }
      
      interface TweetWithMedia {
        text?: string;
        media?: MediaFile[];
      }
      
      type TweetRequestBody = string | TweetWithMediaIds | TweetWithMedia;
      
      // Parse the request body
      const body = await request.json() as TweetRequestBody | TweetRequestBody[];
      
      // Handle different input formats
      if (Array.isArray(body)) {
        // It's a thread (array of tweet objects)
        if (body.length === 0) {
          throw Errors.validation('Thread must contain at least one tweet');
        }
        
        // Get a Twitter client with auto token refresher
        const userClient = await this.getTwitterClient(userId);
        
        // Process each tweet in the thread
        const formattedTweets: SendTweetV2Params[] = [];
        
        for (const tweet of body) {
          // Handle string or object format
          if (typeof tweet === 'string') {
            formattedTweets.push({ text: tweet });
          } else {
            // It's an object
            const tweetData: SendTweetV2Params = { text: tweet.text || '' };
            
            // Handle media uploads if present
            if ('media' in tweet && tweet.media && Array.isArray(tweet.media)) {
              const mediaIds = await this.uploadMediaFiles(env, userId, tweet.media);
              this.addMediaToTweet(tweetData, mediaIds);
            } else if ('media_ids' in tweet && tweet.media_ids && Array.isArray(tweet.media_ids)) {
              // Support for pre-uploaded media IDs
              this.addMediaToTweet(tweetData, tweet.media_ids);
            }
            
            formattedTweets.push(tweetData);
          }
        }
        
        // Post the thread
        const result = await userClient.v2.tweetThread(formattedTweets);
        return this.createJsonResponse(result);
      } else {
        // It's a single tweet (object or string)
        if (typeof body === 'string') {
          // Simple string tweet
          const userClient = await this.getTwitterClient(userId);
          const result = await userClient.v2.tweet({ text: body });
          return this.createJsonResponse(result);
        } else {
          // Object tweet
          if (!body.text && !('media' in body && body.media) && !('media_ids' in body && body.media_ids)) {
            throw Errors.validation('Tweet must contain text or media');
          }
          
          // Get a Twitter client with auto token refresher
          const userClient = await this.getTwitterClient(userId);
          
          // Prepare tweet data
          const tweetData: SendTweetV2Params = { text: body.text || '' };
          
          // Handle media uploads if present
          if ('media' in body && body.media && Array.isArray(body.media)) {
            const mediaIds = await this.uploadMediaFiles(env, userId, body.media);
            this.addMediaToTweet(tweetData, mediaIds);
          } else if ('media_ids' in body && body.media_ids && Array.isArray(body.media_ids)) {
            // Support for pre-uploaded media IDs
            this.addMediaToTweet(tweetData, body.media_ids);
          }
          
          // Post the tweet
          const result = await userClient.v2.tweet(tweetData);
          return this.createJsonResponse(result);
        }
      }
    } catch (error) {
      console.error('Error posting tweet:', error);
      return this.handleTwitterError(error);
    }
  }

  /**
   * Retweet a tweet
   */
  async retweet(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);

      // Parse the request body
      const body = await request.json() as { tweetId: string };
      const { tweetId } = body;

      if (!tweetId) {
        throw Errors.validation('Tweet ID is required');
      }

      // Get a Twitter client with auto token refresher
      const userClient = await this.getTwitterClient(userId);

      // Retweet the tweet
      const result = await userClient.v2.retweet(userId, tweetId);

      return this.createJsonResponse(result);
    } catch (error) {
      console.error('Error retweeting:', error);
      // Use the improved error handling
      return this.handleTwitterError(error);
    }
  }

  /**
   * Quote tweet
   * Handles both single quote tweets and threads with media uploads
   */
  async quoteTweet(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);
      const env = (request as ExtendedRequest).env;
      
      // Define interfaces for request body types
      interface QuoteTweetWithMediaIds {
        tweetId: string;
        text?: string;
        media_ids?: string[];
      }
      
      interface QuoteTweetWithMedia {
        tweetId: string;
        text?: string;
        media?: MediaFile[];
      }
      
      type QuoteTweetRequestBody = QuoteTweetWithMediaIds | QuoteTweetWithMedia;
      
      // Parse the request body
      const body = await request.json() as QuoteTweetRequestBody | QuoteTweetRequestBody[];
      
      // Handle different input formats
      if (Array.isArray(body)) {
        // It's a thread of quote tweets (array of quote tweet objects)
        if (body.length === 0) {
          throw Errors.validation('Thread must contain at least one tweet');
        }
        
        // Get a Twitter client with auto token refresher
        const userClient = await this.getTwitterClient(userId);
        
        // Process each tweet in the thread
        const formattedTweets: SendTweetV2Params[] = [];
        
        for (const tweet of body) {
          if (!tweet.tweetId) {
            throw Errors.validation('Each quote tweet must include a tweetId');
          }
          
          // Prepare tweet data with the quoted tweet URL
          const tweetData: SendTweetV2Params = {
            text: `${tweet.text || ''} https://twitter.com/i/web/status/${tweet.tweetId}`
          };
          
          // Handle media uploads if present
          if ('media' in tweet && tweet.media && Array.isArray(tweet.media)) {
            const mediaIds = await this.uploadMediaFiles(env, userId, tweet.media);
            this.addMediaToTweet(tweetData, mediaIds);
          } else if ('media_ids' in tweet && tweet.media_ids && Array.isArray(tweet.media_ids)) {
            // Support for pre-uploaded media IDs
            this.addMediaToTweet(tweetData, tweet.media_ids);
          }
          
          formattedTweets.push(tweetData);
        }
        
        // Post the thread
        const result = await userClient.v2.tweetThread(formattedTweets);
        return this.createJsonResponse(result);
      } else {
        // It's a single quote tweet
        if (!body.tweetId) {
          throw Errors.validation('Tweet ID is required for quote tweets');
        }
        
        // Get a Twitter client with auto token refresher
        const userClient = await this.getTwitterClient(userId);
        
        // Prepare tweet data with the quoted tweet URL
        const tweetData: SendTweetV2Params = {
          text: `${body.text || ''} https://twitter.com/i/web/status/${body.tweetId}`
        };
        
        // Handle media uploads if present
        if ('media' in body && body.media && Array.isArray(body.media)) {
          const mediaIds = await this.uploadMediaFiles(env, userId, body.media);
          this.addMediaToTweet(tweetData, mediaIds);
        } else if ('media_ids' in body && body.media_ids && Array.isArray(body.media_ids)) {
          // Support for pre-uploaded media IDs
          this.addMediaToTweet(tweetData, body.media_ids);
        }
        
        // Post the quote tweet
        const result = await userClient.v2.tweet(tweetData);
        return this.createJsonResponse(result);
      }
    } catch (error) {
      console.error('Error quote tweeting:', error);
      // Use the improved error handling
      return this.handleTwitterError(error);
    }
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(request: Request): Promise<Response> {
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

      // Delete the tweet
      const result = await userClient.v2.deleteTweet(tweetId);

      return this.createJsonResponse(result);
    } catch (error) {
      console.error('Error deleting tweet:', error);
      // Use the improved error handling
      return this.handleTwitterError(error);
    }
  }

  /**
   * Reply to a tweet
   * Handles both single replies and threaded replies with media uploads
   */
  async replyToTweet(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);
      const env = (request as ExtendedRequest).env;
      
      // Define interfaces for request body types
      interface ReplyTweetWithMediaIds {
        tweetId: string;
        text?: string;
        media_ids?: string[];
      }
      
      interface ReplyTweetWithMedia {
        tweetId: string;
        text?: string;
        media?: MediaFile[];
      }
      
      type ReplyTweetRequestBody = ReplyTweetWithMediaIds | ReplyTweetWithMedia;
      
      // Parse the request body
      const body = await request.json() as ReplyTweetRequestBody | ReplyTweetRequestBody[];
      
      // Handle different input formats
      if (Array.isArray(body)) {
        // It's a thread of replies (array of reply objects)
        if (body.length === 0) {
          throw Errors.validation('Thread must contain at least one tweet');
        }
        
        // Get a Twitter client with auto token refresher
        const userClient = await this.getTwitterClient(userId);
        
        // Process each tweet in the thread
        const formattedTweets: SendTweetV2Params[] = [];
        const previousTweetId = '';
        
        for (let i = 0; i < body.length; i++) {
          const tweet = body[i];
          
          if (i === 0 && !tweet.tweetId) {
            throw Errors.validation('First reply tweet must include a tweetId to reply to');
          }
          
          // Prepare tweet data
          const tweetData: SendTweetV2Params = { text: tweet.text || '' };
          
          // Set the reply ID - first tweet replies to the original, subsequent tweets reply to the previous in thread
          if (i === 0) {
            tweetData.reply = { in_reply_to_tweet_id: tweet.tweetId };
          } else if (previousTweetId) {
            tweetData.reply = { in_reply_to_tweet_id: previousTweetId };
          }
          
          // Handle media uploads if present
          if ('media' in tweet && tweet.media && Array.isArray(tweet.media)) {
            const mediaIds = await this.uploadMediaFiles(env, userId, tweet.media);
            this.addMediaToTweet(tweetData, mediaIds);
          } else if ('media_ids' in tweet && tweet.media_ids && Array.isArray(tweet.media_ids)) {
            // Support for pre-uploaded media IDs
            this.addMediaToTweet(tweetData, tweet.media_ids);
          }
          
          formattedTweets.push(tweetData);
        }
        
        // Post the thread
        const result = await userClient.v2.tweetThread(formattedTweets);
        
        // For simplicity, we'll just return the result without trying to extract IDs
        // The thread will be created properly by Twitter regardless
        
        return this.createJsonResponse(result);
      } else {
        // It's a single reply tweet
        if (!body.tweetId) {
          throw Errors.validation('Tweet ID is required for reply tweets');
        }
        
        // Get a Twitter client with auto token refresher
        const userClient = await this.getTwitterClient(userId);
        
        // Prepare tweet data
        const tweetData: SendTweetV2Params = {
          text: body.text || '',
          reply: { in_reply_to_tweet_id: body.tweetId }
        };
        
        // Handle media uploads if present
        if ('media' in body && body.media && Array.isArray(body.media)) {
          const mediaIds = await this.uploadMediaFiles(env, userId, body.media);
          this.addMediaToTweet(tweetData, mediaIds);
        } else if ('media_ids' in body && body.media_ids && Array.isArray(body.media_ids)) {
          // Support for pre-uploaded media IDs
          this.addMediaToTweet(tweetData, body.media_ids);
        }
        
        // Post the reply tweet
        const result = await userClient.v2.tweet(tweetData);
        return this.createJsonResponse(result);
      }
    } catch (error) {
      console.error('Error replying to tweet:', error);
      // Use the improved error handling
      return this.handleTwitterError(error);
    }
  }

  /**
   * Helper method to add media IDs to a tweet
   */
  private addMediaToTweet(tweetData: SendTweetV2Params, mediaIds: string[]): void {
    if (!mediaIds || mediaIds.length === 0) return;
    
    // Twitter API expects a tuple with 1-4 elements
    const ids = mediaIds.slice(0, 4);

    // Cast to the specific tuple types that Twitter API expects
    if (ids.length === 1) {
      tweetData.media = { media_ids: [ids[0]] as [string] };
    } else if (ids.length === 2) {
      tweetData.media = { media_ids: [ids[0], ids[1]] as [string, string] };
    } else if (ids.length === 3) {
      tweetData.media = { media_ids: [ids[0], ids[1], ids[2]] as [string, string, string] };
    } else if (ids.length === 4) {
      tweetData.media = { media_ids: [ids[0], ids[1], ids[2], ids[3]] as [string, string, string, string] };
    }
  }

  /**
   * Upload media files and return media IDs
   */
  private async uploadMediaFiles(env: Env, userId: string, mediaFiles: MediaFile[]): Promise<string[]> {
    if (!mediaFiles || mediaFiles.length === 0) return [];
    
    const mediaService = new MediaService(env);
    const mediaIds: string[] = [];
    
    for (const mediaFile of mediaFiles) {
      try {
        // Upload the media directly using the new method
        const mediaId = await mediaService.uploadMediaDirect(
          mediaFile.data,
          mediaFile.mimeType || 'application/octet-stream'
        );
        
        if (mediaId) {
          mediaIds.push(mediaId);
          
          // If alt text is provided, set it directly
          if (mediaFile.alt_text) {
            await mediaService.setAltTextDirect(mediaId, mediaFile.alt_text);
          }
        }
      } catch (error) {
        console.error('Error uploading media file:', error);
        // Continue with other files even if one fails
      }
    }
    
    return mediaIds;
  }
}
