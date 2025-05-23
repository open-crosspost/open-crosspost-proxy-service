import type {
  ApiResponse,
  CreatePostRequest,
  DeletePostRequest,
  LikePostRequest,
  MultiStatusData,
  QuotePostRequest,
  ReplyToPostRequest,
  RepostRequest,
  UnlikePostRequest,
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
  async createPost(request: CreatePostRequest): Promise<ApiResponse<MultiStatusData>> {
    return makeRequest<MultiStatusData, CreatePostRequest>(
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
  async repost(request: RepostRequest): Promise<ApiResponse<MultiStatusData>> {
    return makeRequest<MultiStatusData, RepostRequest>(
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
  async quotePost(request: QuotePostRequest): Promise<ApiResponse<MultiStatusData>> {
    return makeRequest<MultiStatusData, QuotePostRequest>(
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
  async replyToPost(request: ReplyToPostRequest): Promise<ApiResponse<MultiStatusData>> {
    return makeRequest<MultiStatusData, ReplyToPostRequest>(
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
  async likePost(request: LikePostRequest): Promise<ApiResponse<MultiStatusData>> {
    return makeRequest<MultiStatusData, LikePostRequest>(
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
  async unlikePost(request: UnlikePostRequest): Promise<ApiResponse<MultiStatusData>> {
    return makeRequest<MultiStatusData, UnlikePostRequest>(
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
  async deletePost(request: DeletePostRequest): Promise<ApiResponse<MultiStatusData>> {
    return makeRequest<MultiStatusData, DeletePostRequest>(
      'DELETE',
      `/api/post`,
      this.options,
      request,
    );
  }
}
