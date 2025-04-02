import { SendTweetV2Params } from 'twitter-api-v2';
import { ApiErrorCode } from '../../abstract/error-hierarchy.ts';
import { PostContent, PostResult } from '../../abstract/platform-post.interface.ts';
import { TwitterError } from '../twitter-error.ts';
import { TwitterPostBase } from './base.ts';

/**
 * Twitter Create Post
 * Handles creating posts and threads on Twitter
 */
export class TwitterCreatePost extends TwitterPostBase {
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
      throw new TwitterError(
        'Failed to create post',
        ApiErrorCode.POST_CREATION_FAILED,
        400,
        error,
        undefined,
        true,
        userId,
      );
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
      throw new TwitterError(
        'Failed to create thread',
        ApiErrorCode.THREAD_CREATION_FAILED,
        400,
        error,
        undefined,
        true,
        userId,
      );
    }
  }
}
