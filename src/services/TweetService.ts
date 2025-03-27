import { SendTweetV2Params } from 'twitter-api-v2';
import { Env } from '../index';
import { extractUserId } from '../middleware/auth';
import { Errors } from '../middleware/errors';
import { BaseTwitterService } from './BaseTwitterService';
import { MediaService } from './MediaService';

/**
 * Media file interface
 */
interface MediaFile {
  data: Blob | string;
  mimeType?: string;
  alt_text?: string;
}

/**
 * Tweet input interface for unified API
 */
interface TweetInput {
  text?: string;
  media?: MediaFile[];
  reply_to?: string;
  quote?: string;
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
   * Post a tweet
   */
  async tweet(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);

      // Parse the request body
      const body = await request.json() as { text?: string; media?: string[] };
      const { text, media } = body;

      if (!text && !media) {
        throw Errors.validation('Tweet must contain text or media');
      }

      // Get a Twitter client with auto token refresher
      const userClient = await this.getTwitterClient(userId);

      // Prepare tweet data
      const tweetData: SendTweetV2Params = { text: text || '' };

      // Add media if present
      if (media && media.length > 0) {
        // Twitter API expects a tuple with 1-4 elements
        const mediaIds = media.slice(0, 4);

        // Cast to the specific tuple types that Twitter API expects
        if (mediaIds.length === 1) {
          tweetData.media = { media_ids: [mediaIds[0]] as [string] };
        } else if (mediaIds.length === 2) {
          tweetData.media = { media_ids: [mediaIds[0], mediaIds[1]] as [string, string] };
        } else if (mediaIds.length === 3) {
          tweetData.media = { media_ids: [mediaIds[0], mediaIds[1], mediaIds[2]] as [string, string, string] };
        } else if (mediaIds.length === 4) {
          tweetData.media = { media_ids: [mediaIds[0], mediaIds[1], mediaIds[2], mediaIds[3]] as [string, string, string, string] };
        }
      }

      // Post the tweet
      const result = await userClient.v2.tweet(tweetData);

      return this.createJsonResponse(result);
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
   */
  async quoteTweet(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);

      // Parse the request body
      const body = await request.json() as { tweetId: string; text: string; media?: string[] };
      const { tweetId, text, media } = body;

      if (!tweetId || !text) {
        throw Errors.validation('Tweet ID and text are required for quote tweets');
      }

      // Get a Twitter client with auto token refresher
      const userClient = await this.getTwitterClient(userId);

      // Prepare tweet data with the quoted tweet URL
      const tweetData: SendTweetV2Params = {
        text: `${text} https://twitter.com/i/web/status/${tweetId}`
      };

      // Add media if present
      if (media && media.length > 0) {
        // Twitter API expects a tuple with 1-4 elements
        const mediaIds = media.slice(0, 4);

        // Cast to the specific tuple types that Twitter API expects
        if (mediaIds.length === 1) {
          tweetData.media = { media_ids: [mediaIds[0]] as [string] };
        } else if (mediaIds.length === 2) {
          tweetData.media = { media_ids: [mediaIds[0], mediaIds[1]] as [string, string] };
        } else if (mediaIds.length === 3) {
          tweetData.media = { media_ids: [mediaIds[0], mediaIds[1], mediaIds[2]] as [string, string, string] };
        } else if (mediaIds.length === 4) {
          tweetData.media = { media_ids: [mediaIds[0], mediaIds[1], mediaIds[2], mediaIds[3]] as [string, string, string, string] };
        }
      }

      // Post the quote tweet
      const result = await userClient.v2.tweet(tweetData);

      return this.createJsonResponse(result);
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
   */
  async replyToTweet(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);

      // Parse the request body
      const body = await request.json() as { tweetId: string; text: string; media?: string[] };
      const { tweetId, text, media } = body;

      if (!tweetId || !text) {
        throw Errors.validation('Tweet ID and text are required');
      }

      // Get a Twitter client with auto token refresher
      const userClient = await this.getTwitterClient(userId);

      // Prepare tweet data
      const tweetData: SendTweetV2Params = {
        text,
        reply: { in_reply_to_tweet_id: tweetId }
      };

      // Add media if present
      if (media && media.length > 0) {
        // Twitter API expects a tuple with 1-4 elements
        const mediaIds = media.slice(0, 4);

        // Cast to the specific tuple types that Twitter API expects
        if (mediaIds.length === 1) {
          tweetData.media = { media_ids: [mediaIds[0]] as [string] };
        } else if (mediaIds.length === 2) {
          tweetData.media = { media_ids: [mediaIds[0], mediaIds[1]] as [string, string] };
        } else if (mediaIds.length === 3) {
          tweetData.media = { media_ids: [mediaIds[0], mediaIds[1], mediaIds[2]] as [string, string, string] };
        } else if (mediaIds.length === 4) {
          tweetData.media = { media_ids: [mediaIds[0], mediaIds[1], mediaIds[2], mediaIds[3]] as [string, string, string, string] };
        }
      }

      // Reply to the tweet
      const result = await userClient.v2.tweet(tweetData);

      return this.createJsonResponse(result);
    } catch (error) {
      console.error('Error replying to tweet:', error);
      // Use the improved error handling
      return this.handleTwitterError(error);
    }
  }

  /**
   * Post a thread of tweets
   */
  async tweetThread(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);

      // Parse the request body
      const body = await request.json() as { tweets: (string | { text: string, media?: string[] })[] };
      const { tweets } = body;

      if (!tweets || !tweets.length) {
        throw Errors.validation('Thread must contain at least one tweet');
      }

      // Get a Twitter client with auto token refresher
      const userClient = await this.getTwitterClient(userId);

      // Format tweets for the thread
      const formattedTweets = tweets.map(tweet => {
        if (typeof tweet === 'string') {
          return { text: tweet } as SendTweetV2Params;
        }

        const tweetData: SendTweetV2Params = { text: tweet.text };

        // Add media if present
        if (tweet.media && tweet.media.length > 0) {
          // Twitter API expects a tuple with 1-4 elements
          const mediaIds = tweet.media.slice(0, 4);

          // Cast to the specific tuple types that Twitter API expects
          if (mediaIds.length === 1) {
            tweetData.media = { media_ids: [mediaIds[0]] as [string] };
          } else if (mediaIds.length === 2) {
            tweetData.media = { media_ids: [mediaIds[0], mediaIds[1]] as [string, string] };
          } else if (mediaIds.length === 3) {
            tweetData.media = { media_ids: [mediaIds[0], mediaIds[1], mediaIds[2]] as [string, string, string] };
          } else if (mediaIds.length === 4) {
            tweetData.media = { media_ids: [mediaIds[0], mediaIds[1], mediaIds[2], mediaIds[3]] as [string, string, string, string] };
          }
        }

        return tweetData;
      });

      // Post the thread
      const result = await userClient.v2.tweetThread(formattedTweets);

      return this.createJsonResponse(result);
    } catch (error) {
      console.error('Error posting tweet thread:', error);
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
      // Create a FormData object for the media upload
      const formData = new FormData();
      
      // Handle different types of media data
      if (typeof mediaFile.data === 'string') {
        formData.append('media', mediaFile.data);
      } else {
        formData.append('media', mediaFile.data as Blob);
      }
      
      formData.append('mimeType', mediaFile.mimeType || 'application/octet-stream');
      
      // Create a mock request with the form data
      const mockRequest = new Request('https://example.com', {
        method: 'POST',
        body: formData,
      });
      
      // Add the user ID to the request
      (mockRequest as any).headers = {
        get: (name: string) => {
          if (name.toLowerCase() === 'x-twitter-user-id') {
            return userId;
          }
          return null;
        }
      };
      
      // Upload the media
      const response = await mediaService.uploadMedia(mockRequest);
      
      // Parse the response to get the media ID
      const result = await response.json() as { media_id?: string };
      
      if (result.media_id) {
        mediaIds.push(result.media_id);
        
        // If alt text is provided, set it
        if (mediaFile.alt_text) {
          // Create a mock request for setting alt text
          const altTextRequest = new Request('https://example.com', {
            method: 'POST',
            body: JSON.stringify({
              media_id: result.media_id,
              alt_text: mediaFile.alt_text
            }),
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          // Add the user ID to the request
          (altTextRequest as any).headers.get = (name: string) => {
            if (name.toLowerCase() === 'x-twitter-user-id') {
              return userId;
            }
            return null;
          };
          
          // Set the alt text
          await mediaService.createMediaMetadata(altTextRequest);
        }
      }
    }
    
    return mediaIds;
  }

  /**
   * Unified tweet method that handles all tweet types
   * This method can handle:
   * - Single tweets
   * - Threaded tweets
   * - Media uploads
   * - Replies
   * - Quote tweets
   */
  async unifiedTweet(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);
      const env = (request as any).env as Env;
      
      // Parse the request body
      const body = await request.json() as TweetInput | TweetInput[];
      
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
          const tweetData: SendTweetV2Params = typeof tweet === 'string' 
            ? { text: tweet } 
            : { text: tweet.text || '' };
          
          // Handle media uploads if present
          if (tweet.media && Array.isArray(tweet.media)) {
            const mediaIds = await this.uploadMediaFiles(env, userId, tweet.media);
            this.addMediaToTweet(tweetData, mediaIds);
          }
          
          // Handle reply
          if (tweet.reply_to) {
            tweetData.reply = { in_reply_to_tweet_id: tweet.reply_to };
          }
          
          // Handle quote tweet
          if (tweet.quote) {
            tweetData.text = `${tweetData.text} https://twitter.com/i/web/status/${tweet.quote}`;
          }
          
          formattedTweets.push(tweetData);
        }
        
        // Post the thread
        const result = await userClient.v2.tweetThread(formattedTweets);
        return this.createJsonResponse(result);
      } else {
        // It's a single tweet (object)
        // Get a Twitter client with auto token refresher
        const userClient = await this.getTwitterClient(userId);
        
        // Prepare tweet data
        const tweetData: SendTweetV2Params = { text: body.text || '' };
        
        // Handle media uploads if present
        if (body.media && Array.isArray(body.media)) {
          const mediaIds = await this.uploadMediaFiles(env, userId, body.media);
          this.addMediaToTweet(tweetData, mediaIds);
        }
        
        // Handle reply
        if (body.reply_to) {
          tweetData.reply = { in_reply_to_tweet_id: body.reply_to };
        }
        
        // Handle quote tweet
        if (body.quote) {
          tweetData.text = `${tweetData.text} https://twitter.com/i/web/status/${body.quote}`;
        }
        
        // Post the tweet
        const result = await userClient.v2.tweet(tweetData);
        return this.createJsonResponse(result);
      }
    } catch (error) {
      console.error('Error in unified tweet:', error);
      return this.handleTwitterError(error);
    }
  }
}
