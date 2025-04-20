import type {
  CreatePostRequest,
  CreatePostResponse,
  DeletePostRequest,
  DeletePostResponse,
  LikePostRequest,
  LikePostResponse,
  QuotePostRequest,
  QuotePostResponse,
  ReplyToPostRequest,
  ReplyToPostResponse,
  RepostRequest,
  RepostResponse,
  UnlikePostRequest,
  UnlikePostResponse,
} from '@crosspost/types';
import { makeRequest, type RequestOptions } from '../core/request.ts';

/**
 * Post-related API operations
 */
export class PostApi {
  private options: RequestOptions;

  /**
   * Creates an instance of PostApi
   * @param options Request options
   */
  constructor(options: RequestOptions) {
    this.options = options;
  }

  /**
   * Creates a new post on the specified target platforms.
   * @param request The post creation request details.
   * @returns A promise resolving with the post creation response.
   */
  async createPost(request: CreatePostRequest): Promise<CreatePostResponse> {
    return makeRequest<CreatePostResponse, CreatePostRequest>(
      'POST',
      '/api/post',
      this.options,
      request,
    );
  }

  /**
   * Reposts an existing post on the specified target platforms.
   * @param request The repost request details.
   * @returns A promise resolving with the repost response.
   */
  async repost(request: RepostRequest): Promise<RepostResponse> {
    return makeRequest<RepostResponse, RepostRequest>(
      'POST',
      '/api/post/repost',
      this.options,
      request,
    );
  }

  /**
   * Quotes an existing post on the specified target platforms.
   * @param request The quote post request details.
   * @returns A promise resolving with the quote post response.
   */
  async quotePost(request: QuotePostRequest): Promise<QuotePostResponse> {
    return makeRequest<QuotePostResponse, QuotePostRequest>(
      'POST',
      '/api/post/quote',
      this.options,
      request,
    );
  }

  /**
   * Replies to an existing post on the specified target platforms.
   * @param request The reply request details.
   * @returns A promise resolving with the reply response.
   */
  async replyToPost(request: ReplyToPostRequest): Promise<ReplyToPostResponse> {
    return makeRequest<ReplyToPostResponse, ReplyToPostRequest>(
      'POST',
      '/api/post/reply',
      this.options,
      request,
    );
  }

  /**
   * Likes a post on the specified target platforms.
   * @param request The like request details.
   * @returns A promise resolving with the like response.
   */
  async likePost(request: LikePostRequest): Promise<LikePostResponse> {
    return makeRequest<LikePostResponse, LikePostRequest>(
      'POST',
      `/api/post/like`,
      this.options,
      request,
    );
  }

  /**
   * Unlikes a post on the specified target platforms.
   * @param request The unlike request details.
   * @returns A promise resolving with the unlike response.
   */
  async unlikePost(request: UnlikePostRequest): Promise<UnlikePostResponse> {
    return makeRequest<UnlikePostResponse, UnlikePostRequest>(
      'DELETE',
      `/api/post/like`,
      this.options,
      request,
    );
  }

  /**
   * Deletes one or more posts.
   * @param request The delete request details.
   * @returns A promise resolving with the delete response.
   */
  async deletePost(request: DeletePostRequest): Promise<DeletePostResponse> {
    return makeRequest<DeletePostResponse, DeletePostRequest>(
      'DELETE',
      `/api/post`,
      this.options,
      request,
    );
  }
}
