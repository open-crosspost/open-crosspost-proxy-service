import { DeleteResult, LikeResult, PlatformName, PostContent, PostResult } from '@crosspost/types';
import { pluginClient } from '../../infrastructure/rpc/plugin-client.js';
import { NearAuthService } from '../../infrastructure/security/near-auth-service.js';

export class PostService {
  constructor(private nearAuthService: NearAuthService) {}

  /**
   * Create a new post
   * @param platform The platform to post to
   * @param userId The user ID creating the post
   * @param content The content of the post or an array of contents for a thread
   * @returns The created post result
   */
  async createPost(
    platform: PlatformName,
    userId: string,
    content: PostContent | PostContent[],
  ): Promise<PostResult> {
    try {
      // Get tokens for the user
      const tokens = await this.nearAuthService.getTokens(userId, platform);

      // Create post via plugin server
      const result = await pluginClient[platform.toLowerCase()].post.create({
        userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        content,
      });

      return result;
    } catch (error) {
      console.error(`Error creating post on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Repost/retweet an existing post
   * @param platform The platform to post to
   * @param userId The user ID performing the repost
   * @param postId The ID of the post to repost
   * @returns The repost result
   */
  async repost(platform: PlatformName, userId: string, postId: string): Promise<PostResult> {
    try {
      // Get tokens for the user
      const tokens = await this.nearAuthService.getTokens(userId, platform);

      // Repost via plugin server
      const result = await pluginClient[platform.toLowerCase()].post.repost({
        userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        postId,
      });

      return result;
    } catch (error) {
      console.error(`Error reposting on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Quote an existing post
   * @param platform The platform to post to
   * @param userId The user ID quoting the post
   * @param postId The ID of the post to quote
   * @param content The content to add to the quote or an array of contents for a thread
   * @returns The quote post result
   */
  async quotePost(
    platform: PlatformName,
    userId: string,
    postId: string,
    content: PostContent | PostContent[],
  ): Promise<PostResult> {
    try {
      // Get tokens for the user
      const tokens = await this.nearAuthService.getTokens(userId, platform);

      // Quote post via plugin server
      const result = await pluginClient[platform.toLowerCase()].post.quote({
        userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        postId,
        content,
      });

      return result;
    } catch (error) {
      console.error(`Error quoting post on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Delete a post
   * @param platform The platform to post to
   * @param userId The user ID deleting the post
   * @param postId The ID of the post to delete
   * @returns The delete result
   */
  async deletePost(platform: PlatformName, userId: string, postId: string): Promise<DeleteResult> {
    try {
      // Get tokens for the user
      const tokens = await this.nearAuthService.getTokens(userId, platform);

      // Delete post via plugin server
      const result = await pluginClient[platform.toLowerCase()].post.delete({
        userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        postId,
      });

      return result;
    } catch (error) {
      console.error(`Error deleting post on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Reply to an existing post
   * @param platform The platform to post to
   * @param userId The user ID replying to the post
   * @param postId The ID of the post to reply to
   * @param content The content of the reply or an array of contents for a thread
   * @returns The reply post result
   */
  async replyToPost(
    platform: PlatformName,
    userId: string,
    postId: string,
    content: PostContent | PostContent[],
  ): Promise<PostResult> {
    try {
      // Get tokens for the user
      const tokens = await this.nearAuthService.getTokens(userId, platform);

      // Reply to post via plugin server
      const result = await pluginClient[platform.toLowerCase()].post.reply({
        userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        postId,
        content,
      });

      return result;
    } catch (error) {
      console.error(`Error replying to post on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Like a post
   * @param platform The platform to post to
   * @param userId The user ID liking the post
   * @param postId The ID of the post to like
   * @returns The like result
   */
  async likePost(platform: PlatformName, userId: string, postId: string): Promise<LikeResult> {
    try {
      // Get tokens for the user
      const tokens = await this.nearAuthService.getTokens(userId, platform);

      // Like post via plugin server
      const result = await pluginClient[platform.toLowerCase()].post.like({
        userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        postId,
      });

      return result;
    } catch (error) {
      console.error(`Error liking post on ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Unlike a post
   * @param platform The platform to post to
   * @param userId The user ID unliking the post
   * @param postId The ID of the post to unlike
   * @returns The unlike result
   */
  async unlikePost(platform: PlatformName, userId: string, postId: string): Promise<LikeResult> {
    try {
      // Get tokens for the user
      const tokens = await this.nearAuthService.getTokens(userId, platform);

      // Unlike post via plugin server
      const result = await pluginClient[platform.toLowerCase()].post.unlike({
        userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        postId,
      });

      return result;
    } catch (error) {
      console.error(`Error unliking post on ${platform}:`, error);
      throw error;
    }
  }
}
