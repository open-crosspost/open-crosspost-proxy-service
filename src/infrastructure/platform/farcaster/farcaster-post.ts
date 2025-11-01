import { DeleteResult, LikeResult, PostContent, PostResult } from '@crosspost/types';
import { PlatformPost } from '../abstract/platform-post.interface.ts';
import {
  FarcasterCreatePost,
  FarcasterDeletePost,
  FarcasterLikePost,
  FarcasterQuotePost,
  FarcasterRecast,
  FarcasterReplyPost,
} from './post/index.ts';
import { FarcasterClient } from './farcaster-client.ts';
import { FarcasterMedia } from './farcaster-media.ts';

export class FarcasterPost implements PlatformPost {
  private farcasterClient: FarcasterClient;
  private farcasterMedia: FarcasterMedia;
  private createPostService: FarcasterCreatePost;
  private repostService: FarcasterRecast;
  private quotePostService: FarcasterQuotePost;
  private replyPostService: FarcasterReplyPost;
  private likePostService: FarcasterLikePost;
  private deletePostService: FarcasterDeletePost;

  constructor(farcasterClient: FarcasterClient, farcasterMedia: FarcasterMedia) {
    this.farcasterClient = farcasterClient;
    this.farcasterMedia = farcasterMedia;

    // Pass the shared client and media service to each specialized service
    this.createPostService = new FarcasterCreatePost(this.farcasterClient, this.farcasterMedia);
    this.repostService = new FarcasterRecast(this.farcasterClient, this.farcasterMedia);
    this.quotePostService = new FarcasterQuotePost(this.farcasterClient, this.farcasterMedia);
    this.replyPostService = new FarcasterReplyPost(this.farcasterClient, this.farcasterMedia);
    this.likePostService = new FarcasterLikePost(this.farcasterClient, this.farcasterMedia);
    this.deletePostService = new FarcasterDeletePost(this.farcasterClient, this.farcasterMedia);
  }

  /**
   * Create a new post
   * @param userId The user ID creating the post
   * @param content The content of the post
   * @returns The created post result
   */
  async createPost(userId: string, content: PostContent | PostContent[]): Promise<PostResult> {
    return await this.createPostService.createPost(userId, content);
  }

  /**
   * Repost/retweet an existing post
   * @param userId The user ID performing the repost
   * @param postId The ID of the post to repost
   * @returns The repost result
   */
  async repost(userId: string, postId: string): Promise<PostResult> {
    return await this.repostService.repost(userId, postId);
  }

  /**
   * Quote an existing post
   * @param userId The user ID quoting the post
   * @param postId The ID of the post to quote
   * @param content The content to add to the quote
   * @returns The quote post result
   */
  async quotePost(userId: string, postId: string, content: PostContent): Promise<PostResult> {
    return await this.quotePostService.quotePost(userId, postId, content);
  }

  /**
   * Delete a post
   * @param userId The user ID deleting the post
   * @param postId The ID of the post to delete
   * @returns The delete result
   */
  async deletePost(userId: string, postId: string): Promise<DeleteResult> {
    return await this.deletePostService.deletePost(userId, postId);
  }

  /**
   * Reply to an existing post
   * @param userId The user ID replying to the post
   * @param postId The ID of the post to reply to
   * @param content The content of the reply
   * @returns The reply post result
   */
  async replyToPost(userId: string, postId: string, content: PostContent): Promise<PostResult> {
    return await this.replyPostService.replyToPost(userId, postId, content);
  }

  /**
   * Like a post
   * @param userId The user ID liking the post
   * @param postId The ID of the post to like
   * @returns The like result
   */
  async likePost(userId: string, postId: string): Promise<LikeResult> {
    return await this.likePostService.likePost(userId, postId);
  }

  /**
   * Unlike a post
   * @param userId The user ID unliking the post
   * @param postId The ID of the post to unlike
   * @returns The unlike result
   */
  async unlikePost(userId: string, postId: string): Promise<LikeResult> {
    return await this.likePostService.unlikePost(userId, postId);
  }
}
