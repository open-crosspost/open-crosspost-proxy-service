import { SendTweetV2Params } from 'twitter-api-v2';
import { Env } from '../../../config/env.ts';
import { MediaCache } from '../../../utils/media-cache.utils.ts';
import {
  DeleteResult,
  LikeResult,
  MediaContent,
  PlatformPost,
  PostContent,
  PostResult,
} from '../abstract/platform-post.interface.ts';
import { TwitterClient } from './twitter-client.ts';
import { TwitterMedia } from './twitter-media.ts';

/**
 * Twitter Post
 * Implements the PlatformPost interface for Twitter
 */
export class TwitterPost implements PlatformPost {
  private env: Env;
  private twitterClient: TwitterClient;
  private twitterMedia: TwitterMedia;

  constructor(env: Env) {
    this.env = env;
    this.twitterClient = new TwitterClient(env);
    this.twitterMedia = new TwitterMedia(env);
  }

  /**
   * Create a new post
   * @param userId The user ID creating the post
   * @param content The content of the post
   * @returns The created post result
   */
  async createPost(userId: string, content: PostContent): Promise<PostResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Handle single post or thread
      if (Array.isArray(content)) {
        // It's a thread
        return this.createThread(userId, content);
      }

      // Prepare tweet data
      const tweetData: SendTweetV2Params = { text: content.text || '' };

      // Handle media if present
      if (content.media && content.media.length > 0) {
        const mediaIds = await this.uploadMediaFiles(userId, content.media);
        this.addMediaToTweet(tweetData, mediaIds);
      }

      // Post the tweet
      const result = await client.v2.tweet(tweetData);

      return {
        id: result.data.id,
        text: result.data.text,
        createdAt: new Date().toISOString(),
        mediaIds: tweetData.media?.media_ids || [],
      };
    } catch (error) {
      console.error('Error creating post:', error);
      throw new Error('Failed to create post');
    }
  }

  /**
   * Create a thread of posts
   * @param userId The user ID creating the thread
   * @param contentArray Array of post contents for the thread
   * @returns The thread result
   */
  private async createThread(userId: string, contentArray: PostContent[]): Promise<PostResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Process each tweet in the thread
      const formattedTweets: SendTweetV2Params[] = [];

      for (const content of contentArray) {
        // Prepare tweet data
        const tweetData: SendTweetV2Params = { text: content.text || '' };

        // Handle media if present
        if (content.media && content.media.length > 0) {
          const mediaIds = await this.uploadMediaFiles(userId, content.media);
          this.addMediaToTweet(tweetData, mediaIds);
        }

        formattedTweets.push(tweetData);
      }

      // Post the thread
      const result = await client.v2.tweetThread(formattedTweets);

      // Return the first tweet's info
      return {
        id: result[0].data.id,
        text: result[0].data.text,
        createdAt: new Date().toISOString(),
        threadIds: result.map((tweet) => tweet.data.id),
      };
    } catch (error) {
      console.error('Error creating thread:', error);
      throw new Error('Failed to create thread');
    }
  }

  /**
   * Repost/retweet an existing post
   * @param userId The user ID performing the repost
   * @param postId The ID of the post to repost
   * @returns The repost result
   */
  async repost(userId: string, postId: string): Promise<PostResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Retweet the tweet
      const result = await client.v2.retweet(userId, postId);

      return {
        id: result.data.retweeted ? postId : '',
        createdAt: new Date().toISOString(),
        success: result.data.retweeted,
      };
    } catch (error) {
      console.error('Error reposting:', error);
      throw new Error('Failed to repost');
    }
  }

  /**
   * Quote an existing post
   * @param userId The user ID quoting the post
   * @param postId The ID of the post to quote
   * @param content The content to add to the quote
   * @returns The quote post result
   */
  async quotePost(userId: string, postId: string, content: PostContent): Promise<PostResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Handle thread of quote tweets
      if (Array.isArray(content)) {
        return this.createQuoteThread(userId, postId, content);
      }

      // Prepare tweet data with the quoted tweet URL
      const tweetData: SendTweetV2Params = {
        text: `${content.text || ''} https://twitter.com/i/web/status/${postId}`,
      };

      // Handle media if present
      if (content.media && content.media.length > 0) {
        const mediaIds = await this.uploadMediaFiles(userId, content.media);
        this.addMediaToTweet(tweetData, mediaIds);
      }

      // Post the quote tweet
      const result = await client.v2.tweet(tweetData);

      return {
        id: result.data.id,
        text: result.data.text,
        createdAt: new Date().toISOString(),
        mediaIds: tweetData.media?.media_ids || [],
        quotedPostId: postId,
      };
    } catch (error) {
      console.error('Error quoting post:', error);
      throw new Error('Failed to quote post');
    }
  }

  /**
   * Create a thread of quote tweets
   * @param userId The user ID creating the thread
   * @param postId The ID of the post to quote
   * @param contentArray Array of post contents for the thread
   * @returns The thread result
   */
  private async createQuoteThread(
    userId: string,
    postId: string,
    contentArray: PostContent[],
  ): Promise<PostResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Process each tweet in the thread
      const formattedTweets: SendTweetV2Params[] = [];

      // First tweet quotes the original
      const firstContent = contentArray[0];
      const firstTweetData: SendTweetV2Params = {
        text: `${firstContent.text || ''} https://twitter.com/i/web/status/${postId}`,
      };

      // Handle media if present
      if (firstContent.media && firstContent.media.length > 0) {
        const mediaIds = await this.uploadMediaFiles(userId, firstContent.media);
        this.addMediaToTweet(firstTweetData, mediaIds);
      }

      formattedTweets.push(firstTweetData);

      // Add the rest of the thread
      for (let i = 1; i < contentArray.length; i++) {
        const content = contentArray[i];
        const tweetData: SendTweetV2Params = { text: content.text || '' };

        // Handle media if present
        if (content.media && content.media.length > 0) {
          const mediaIds = await this.uploadMediaFiles(userId, content.media);
          this.addMediaToTweet(tweetData, mediaIds);
        }

        formattedTweets.push(tweetData);
      }

      // Post the thread
      const result = await client.v2.tweetThread(formattedTweets);

      // Return the first tweet's info
      return {
        id: result[0].data.id,
        text: result[0].data.text,
        createdAt: new Date().toISOString(),
        quotedPostId: postId,
        threadIds: result.map((tweet) => tweet.data.id),
      };
    } catch (error) {
      console.error('Error creating quote thread:', error);
      throw new Error('Failed to create quote thread');
    }
  }

  /**
   * Delete a post
   * @param userId The user ID deleting the post
   * @param postId The ID of the post to delete
   * @returns The delete result
   */
  async deletePost(userId: string, postId: string): Promise<DeleteResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Delete the tweet
      const result = await client.v2.deleteTweet(postId);

      return {
        success: result.data.deleted,
        id: postId,
      };
    } catch (error) {
      console.error('Error deleting post:', error);
      throw new Error('Failed to delete post');
    }
  }

  /**
   * Reply to an existing post
   * @param userId The user ID replying to the post
   * @param postId The ID of the post to reply to
   * @param content The content of the reply
   * @returns The reply post result
   */
  async replyToPost(userId: string, postId: string, content: PostContent): Promise<PostResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Handle thread of replies
      if (Array.isArray(content)) {
        return this.createReplyThread(userId, postId, content);
      }

      // Prepare tweet data
      const tweetData: SendTweetV2Params = {
        text: content.text || '',
        reply: { in_reply_to_tweet_id: postId },
      };

      // Handle media if present
      if (content.media && content.media.length > 0) {
        const mediaIds = await this.uploadMediaFiles(userId, content.media);
        this.addMediaToTweet(tweetData, mediaIds);
      }

      // Post the reply
      const result = await client.v2.tweet(tweetData);

      return {
        id: result.data.id,
        text: result.data.text,
        createdAt: new Date().toISOString(),
        mediaIds: tweetData.media?.media_ids || [],
        inReplyToId: postId,
      };
    } catch (error) {
      console.error('Error replying to post:', error);
      throw new Error('Failed to reply to post');
    }
  }

  /**
   * Create a thread of replies
   * @param userId The user ID creating the thread
   * @param postId The ID of the post to reply to
   * @param contentArray Array of post contents for the thread
   * @returns The thread result
   */
  private async createReplyThread(
    userId: string,
    postId: string,
    contentArray: PostContent[],
  ): Promise<PostResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Process each tweet in the thread
      const formattedTweets: SendTweetV2Params[] = [];

      // First tweet replies to the original
      const firstContent = contentArray[0];
      const firstTweetData: SendTweetV2Params = {
        text: firstContent.text || '',
        reply: { in_reply_to_tweet_id: postId },
      };

      // Handle media if present
      if (firstContent.media && firstContent.media.length > 0) {
        const mediaIds = await this.uploadMediaFiles(userId, firstContent.media);
        this.addMediaToTweet(firstTweetData, mediaIds);
      }

      formattedTweets.push(firstTweetData);

      // Add the rest of the thread
      for (let i = 1; i < contentArray.length; i++) {
        const content = contentArray[i];
        const tweetData: SendTweetV2Params = { text: content.text || '' };

        // Handle media if present
        if (content.media && content.media.length > 0) {
          const mediaIds = await this.uploadMediaFiles(userId, content.media);
          this.addMediaToTweet(tweetData, mediaIds);
        }

        formattedTweets.push(tweetData);
      }

      // Post the thread
      const result = await client.v2.tweetThread(formattedTweets);

      // Return the first tweet's info
      return {
        id: result[0].data.id,
        text: result[0].data.text,
        createdAt: new Date().toISOString(),
        inReplyToId: postId,
        threadIds: result.map((tweet) => tweet.data.id),
      };
    } catch (error) {
      console.error('Error creating reply thread:', error);
      throw new Error('Failed to create reply thread');
    }
  }

  /**
   * Like a post
   * @param userId The user ID liking the post
   * @param postId The ID of the post to like
   * @returns The like result
   */
  async likePost(userId: string, postId: string): Promise<LikeResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Like the tweet
      const result = await client.v2.like(userId, postId);

      return {
        success: result.data.liked,
        id: postId,
      };
    } catch (error) {
      console.error('Error liking post:', error);
      throw new Error('Failed to like post');
    }
  }

  /**
   * Unlike a post
   * @param userId The user ID unliking the post
   * @param postId The ID of the post to unlike
   * @returns The unlike result
   */
  async unlikePost(userId: string, postId: string): Promise<LikeResult> {
    try {
      const client = await this.twitterClient.getClientForUser(userId);

      // Unlike the tweet
      const result = await client.v2.unlike(userId, postId);

      return {
        success: !result.data.liked,
        id: postId,
      };
    } catch (error) {
      console.error('Error unliking post:', error);
      throw new Error('Failed to unlike post');
    }
  }

  /**
   * Upload media files and return media IDs
   * @param userId The user ID uploading the media
   * @param mediaFiles The media files to upload
   * @returns Array of media IDs
   */
  private async uploadMediaFiles(userId: string, mediaFiles: MediaContent[]): Promise<string[]> {
    if (!mediaFiles || mediaFiles.length === 0) return [];

    const mediaIds: string[] = [];
    const mediaCache = MediaCache.getInstance();

    for (const mediaFile of mediaFiles) {
      try {
        // Check if we already have this media file cached
        const cachedMediaId = await mediaCache.getCachedMediaId(mediaFile);

        if (cachedMediaId) {
          console.log('Using cached media ID:', cachedMediaId);
          mediaIds.push(cachedMediaId);
          continue;
        }

        // Upload the media using the TwitterMedia service
        const result = await this.twitterMedia.uploadMedia(userId, mediaFile);

        if (result.mediaId) {
          // Cache the media ID for potential reuse
          await mediaCache.cacheMediaId(mediaFile, result.mediaId);
          mediaIds.push(result.mediaId);
        }
      } catch (error) {
        console.error('Error uploading media file:', error);
        // Continue with other files even if one fails
      }
    }

    return mediaIds;
  }

  /**
   * Helper method to add media IDs to a tweet
   * @param tweetData The tweet data to add media to
   * @param mediaIds The media IDs to add
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
      tweetData.media = {
        media_ids: [ids[0], ids[1], ids[2], ids[3]] as [string, string, string, string],
      };
    }
  }
}
