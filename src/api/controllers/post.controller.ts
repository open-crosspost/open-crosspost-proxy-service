import { PostService } from '../../domain/services/post.service';
import { Env } from '../../config/env';
import { ExtendedRequest } from '../../types/request.types';
import { z } from 'zod';
import { PostContent } from '../../infrastructure/platform/abstract/platform-post.interface';

/**
 * Post Controller
 * Handles HTTP requests for post-related operations
 */
export class PostController {
  private postService: PostService;
  
  constructor(env: Env) {
    this.postService = new PostService(env);
  }
  
  /**
   * Create a new post
   * @param request The HTTP request
   * @returns HTTP response
   */
  async createPost(request: ExtendedRequest): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = request.headers.get('X-User-ID');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Parse request body
      const body: any = await request.json();
      
      // Validate request body
      let content: PostContent | PostContent[];
      
      if (Array.isArray(body)) {
        // It's a thread
        content = body.map((item: any) => ({
          text: item.text || '',
          media: item.media
        }));
      } else if (typeof body === 'string') {
        // It's a simple string tweet
        content = { text: body };
      } else {
        // It's an object
        content = {
          text: body.text || '',
          media: body.media
        };
      }
      
      // Create the post
      const result = await this.postService.createPost(userId, content);
      
      // Return the result
      return this.postService.createResponse(result);
    } catch (error) {
      console.error('Error creating post:', error);
      return this.postService.createErrorResponse(error, 500);
    }
  }
  
  /**
   * Repost/retweet an existing post
   * @param request The HTTP request
   * @returns HTTP response
   */
  async repost(request: ExtendedRequest): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = request.headers.get('X-User-ID');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Parse request body
      const body: any = await request.json();
      
      // Validate request body
      const schema = z.object({
        postId: z.string()
      });
      
      const result = schema.safeParse(body);
      if (!result.success) {
        return new Response(JSON.stringify({ error: 'Invalid request body', details: result.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Repost the post
      const repostResult = await this.postService.repost(userId, result.data.postId);
      
      // Return the result
      return this.postService.createResponse(repostResult);
    } catch (error) {
      console.error('Error reposting:', error);
      return this.postService.createErrorResponse(error, 500);
    }
  }
  
  /**
   * Quote an existing post
   * @param request The HTTP request
   * @returns HTTP response
   */
  async quotePost(request: ExtendedRequest): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = request.headers.get('X-User-ID');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Parse request body
      const body: any = await request.json();
      
      // Validate request body
      if (Array.isArray(body)) {
        // It's a thread of quote tweets
        if (body.length === 0 || !body[0].postId) {
          return new Response(JSON.stringify({ error: 'Thread must contain at least one tweet with a postId' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const postId = body[0].postId;
        const content = body.map((tweet: any) => ({
          text: tweet.text,
          media: tweet.media
        }));
        
        // Quote the post with a thread
        const result = await this.postService.quotePost(userId, postId, content);
        
        // Return the result
        return this.postService.createResponse(result);
      } else {
        // It's a single quote tweet
        const schema = z.object({
          postId: z.string(),
          text: z.string().optional(),
          media: z.array(z.any()).optional()
        });
        
        const result = schema.safeParse(body);
        if (!result.success) {
          return new Response(JSON.stringify({ error: 'Invalid request body', details: result.error }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const { postId, ...content } = result.data;
        
        // Quote the post
        const quoteResult = await this.postService.quotePost(userId, postId, content);
        
        // Return the result
        return this.postService.createResponse(quoteResult);
      }
    } catch (error) {
      console.error('Error quoting post:', error);
      return this.postService.createErrorResponse(error, 500);
    }
  }
  
  /**
   * Delete a post
   * @param request The HTTP request
   * @returns HTTP response
   */
  async deletePost(request: ExtendedRequest): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = request.headers.get('X-User-ID');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Get the post ID from the URL
      const postId = request.params?.id;
      if (!postId) {
        return new Response(JSON.stringify({ error: 'Post ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Delete the post
      const result = await this.postService.deletePost(userId, postId);
      
      // Return the result
      return this.postService.createResponse(result);
    } catch (error) {
      console.error('Error deleting post:', error);
      return this.postService.createErrorResponse(error, 500);
    }
  }
  
  /**
   * Reply to an existing post
   * @param request The HTTP request
   * @returns HTTP response
   */
  async replyToPost(request: ExtendedRequest): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = request.headers.get('X-User-ID');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Parse request body
      const body: any = await request.json();
      
      // Validate request body
      if (Array.isArray(body)) {
        // It's a thread of replies
        if (body.length === 0 || !body[0].postId) {
          return new Response(JSON.stringify({ error: 'Thread must contain at least one tweet with a postId' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const postId = body[0].postId;
        const content = body.map((tweet: any) => ({
          text: tweet.text,
          media: tweet.media
        }));
        
        // Reply to the post with a thread
        const result = await this.postService.replyToPost(userId, postId, content);
        
        // Return the result
        return this.postService.createResponse(result);
      } else {
        // It's a single reply
        const schema = z.object({
          postId: z.string(),
          text: z.string().optional(),
          media: z.array(z.any()).optional()
        });
        
        const result = schema.safeParse(body);
        if (!result.success) {
          return new Response(JSON.stringify({ error: 'Invalid request body', details: result.error }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const { postId, ...content } = result.data;
        
        // Reply to the post
        const replyResult = await this.postService.replyToPost(userId, postId, content);
        
        // Return the result
        return this.postService.createResponse(replyResult);
      }
    } catch (error) {
      console.error('Error replying to post:', error);
      return this.postService.createErrorResponse(error, 500);
    }
  }
  
  /**
   * Like a post
   * @param request The HTTP request
   * @returns HTTP response
   */
  async likePost(request: ExtendedRequest): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = request.headers.get('X-User-ID');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Get the post ID from the URL
      const postId = request.params?.id;
      if (!postId) {
        return new Response(JSON.stringify({ error: 'Post ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Like the post
      const result = await this.postService.likePost(userId, postId);
      
      // Return the result
      return this.postService.createResponse(result);
    } catch (error) {
      console.error('Error liking post:', error);
      return this.postService.createErrorResponse(error, 500);
    }
  }
  
  /**
   * Unlike a post
   * @param request The HTTP request
   * @returns HTTP response
   */
  async unlikePost(request: ExtendedRequest): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = request.headers.get('X-User-ID');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Get the post ID from the URL
      const postId = request.params?.id;
      if (!postId) {
        return new Response(JSON.stringify({ error: 'Post ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Unlike the post
      const result = await this.postService.unlikePost(userId, postId);
      
      // Return the result
      return this.postService.createResponse(result);
    } catch (error) {
      console.error('Error unliking post:', error);
      return this.postService.createErrorResponse(error, 500);
    }
  }
}
