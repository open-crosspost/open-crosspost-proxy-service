import { TwitterApi } from 'twitter-api-v2';
import { Env } from '../index';
import { extractUserId } from '../middleware/auth';
import { Errors } from '../middleware/errors';
import { BaseTwitterService } from './BaseTwitterService';

/**
 * Twitter Service
 * Handles communication with the Twitter API
 */
export class TwitterService extends BaseTwitterService {
  private oauth2Client: TwitterApi;
  private oauth1Client: TwitterApi | null;

  constructor(env: Env) {
    super(env);

    // Initialize OAuth 2.0 client for tweet operations
    this.oauth2Client = new TwitterApi({
      clientId: env.TWITTER_CLIENT_ID,
      clientSecret: env.TWITTER_CLIENT_SECRET,
    });

    // Initialize OAuth 1.0a client for media uploads if credentials are provided
    if (
      env.TWITTER_API_KEY &&
      env.TWITTER_API_SECRET &&
      env.TWITTER_ACCESS_TOKEN &&
      env.TWITTER_ACCESS_SECRET
    ) {
      try {
        this.oauth1Client = new TwitterApi({
          appKey: env.TWITTER_API_KEY,
          appSecret: env.TWITTER_API_SECRET,
          accessToken: env.TWITTER_ACCESS_TOKEN,
          accessSecret: env.TWITTER_ACCESS_SECRET,
        });
        console.log("OAuth 1.0a client initialized successfully");
      } catch (error) {
        console.error("Failed to initialize OAuth 1.0a client:", error);
        this.oauth1Client = null;
      }
    } else {
      console.warn("Missing OAuth 1.0a credentials - media uploads will not work");
      this.oauth1Client = null;
    }
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
      const tweetData: any = { text: text || '' };

      // Add media if present
      if (media && media.length > 0) {
        tweetData.media = { media_ids: media };
      }

      // Post the tweet
      const result = await userClient.v2.tweet(tweetData);

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('Error posting tweet:', error);

      // Handle token expiration
      if (error.code === 401) {
        throw Errors.authentication('Authentication failed. Your token may have expired.');
      }

      throw error;
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

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('Error retweeting:', error);

      // Handle token expiration
      if (error.code === 401) {
        throw Errors.authentication('Authentication failed. Your token may have expired.');
      }

      throw error;
    }
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

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('Error liking tweet:', error);

      // Handle token expiration
      if (error.code === 401) {
        throw Errors.authentication('Authentication failed. Your token may have expired.');
      }

      throw error;
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

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('Error unliking tweet:', error);

      // Handle token expiration
      if (error.code === 401) {
        throw Errors.authentication('Authentication failed. Your token may have expired.');
      }

      throw error;
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

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('Error deleting tweet:', error);

      // Handle token expiration
      if (error.code === 401) {
        throw Errors.authentication('Authentication failed. Your token may have expired.');
      }

      throw error;
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
      const tweetData: any = {
        text,
        reply: { in_reply_to_tweet_id: tweetId }
      };

      // Add media if present
      if (media && media.length > 0) {
        tweetData.media = { media_ids: media };
      }

      // Reply to the tweet
      const result = await userClient.v2.tweet(tweetData);

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('Error replying to tweet:', error);

      // Handle token expiration
      if (error.code === 401) {
        throw Errors.authentication('Authentication failed. Your token may have expired.');
      }

      throw error;
    }
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
      });

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('Error getting timeline:', error);

      // Handle token expiration
      if (error.code === 401) {
        throw Errors.authentication('Authentication failed. Your token may have expired.');
      }

      throw error;
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
      });

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('Error getting mentions:', error);

      // Handle token expiration
      if (error.code === 401) {
        throw Errors.authentication('Authentication failed. Your token may have expired.');
      }

      throw error;
    }
  }

  /**
   * Upload media
   */
  async uploadMedia(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);

      // Check if OAuth 1.0a client is available
      if (!this.oauth1Client) {
        throw Errors.validation('Media uploads require OAuth 1.0a credentials which are not configured');
      }

      // Get the media from the request
      const formData = await request.formData();
      const media = formData.get('media');
      const mimeType = formData.get('mimeType') as string || 'application/octet-stream';

      if (!media) {
        throw Errors.validation('Media is required');
      }

      // Convert to buffer if it's a string
      let mediaBuffer: any; // Using any to bypass type checking for now
      if (typeof media === 'string') {
        // Convert base64 string to buffer
        const base64Data = media.replace(/^data:image\/\w+;base64,/, '');
        mediaBuffer = Buffer.from(base64Data, 'base64');
      } else if ((media as any) instanceof ArrayBuffer) {
        mediaBuffer = media;
      } else if ((media as any) instanceof Blob) {
        mediaBuffer = await (media as any).arrayBuffer();
      } else {
        throw Errors.validation('Unsupported media format');
      }

      // Upload the media using OAuth 1.0a client
      const mediaId = await this.oauth1Client.v1.uploadMedia(mediaBuffer as any, { mimeType });

      return new Response(JSON.stringify({ media_id: mediaId }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('Error uploading media:', error);

      // Handle token expiration
      if (error.code === 401) {
        throw Errors.authentication('Authentication failed. Your token may have expired.');
      }

      throw error;
    }
  }

  /**
   * Get media upload status
   */
  async getMediaStatus(request: Request): Promise<Response> {
    try {
      const userId = extractUserId(request);

      // Get the media ID from the URL
      const url = new URL(request.url);
      const mediaId = url.pathname.split('/').pop();

      if (!mediaId) {
        throw Errors.validation('Media ID is required');
      }

      // Get the media status
      // Note: This method doesn't exist in the TwitterApi class, so we need to implement it
      // or use a different approach
      throw Errors.internal('Media status check not implemented');
    } catch (error: any) {
      console.error('Error getting media status:', error);
      throw error;
    }
  }
}
