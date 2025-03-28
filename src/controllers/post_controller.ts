import { Context } from "../../deps.ts";
import { PostService } from "../domain/services/post.service.ts";
import { getEnv } from "../config/env.ts";
import { z } from "../../deps.ts";
import { PostContent } from "../infrastructure/platform/abstract/platform-post.interface.ts";

/**
 * Post Controller
 * Handles HTTP requests for post-related operations
 */
export class PostController {
  private postService: PostService;
  
  constructor() {
    const env = getEnv();
    this.postService = new PostService(env);
  }
  
  /**
   * Create a new post
   * @param c The Hono context
   * @returns HTTP response
   */
  async createPost(c: Context): Promise<Response> {
    try {
      // Extract user ID from context
      const userId = c.get("userId") as string;
      
      // Parse request body
      const body = await c.req.json();
      
      // Validate request body
      let content: PostContent | PostContent[];
      
      if (Array.isArray(body)) {
        // It's a thread
        content = body.map((item: any) => ({
          text: item.text || "",
          media: item.media
        }));
      } else if (typeof body === "string") {
        // It's a simple string tweet
        content = { text: body };
      } else {
        // It's an object
        content = {
          text: body.text || "",
          media: body.media
        };
      }
      
      // Create the post
      const result = await this.postService.createPost(userId, content);
      
      // Return the result
      return c.json({ data: result });
    } catch (error) {
      console.error("Error creating post:", error);
      return c.json({
        error: {
          type: "internal_error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
          status: 500
        }
      }, 500);
    }
  }
  
  /**
   * Repost/retweet an existing post
   * @param c The Hono context
   * @returns HTTP response
   */
  async repost(c: Context): Promise<Response> {
    try {
      // Extract user ID from context
      const userId = c.get("userId") as string;
      
      // Parse request body
      const body = await c.req.json();
      
      // Validate request body
      const schema = z.object({
        postId: z.string()
      });
      
      const result = schema.safeParse(body);
      if (!result.success) {
        return c.json({ 
          error: {
            type: "validation_error",
            message: "Invalid request body",
            details: result.error
          }
        }, 400);
      }
      
      // Repost the post
      const repostResult = await this.postService.repost(userId, result.data.postId);
      
      // Return the result
      return c.json({ data: repostResult });
    } catch (error) {
      console.error("Error reposting:", error);
      return c.json({
        error: {
          type: "internal_error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
          status: 500
        }
      }, 500);
    }
  }
  
  /**
   * Quote an existing post
   * @param c The Hono context
   * @returns HTTP response
   */
  async quotePost(c: Context): Promise<Response> {
    try {
      // Extract user ID from context
      const userId = c.get("userId") as string;
      
      // Parse request body
      const body = await c.req.json();
      
      // Validate request body
      if (Array.isArray(body)) {
        // It's a thread of quote tweets
        if (body.length === 0 || !body[0].postId) {
          return c.json({ 
            error: {
              type: "validation_error",
              message: "Thread must contain at least one tweet with a postId"
            }
          }, 400);
        }
        
        const postId = body[0].postId;
        const content = body.map((tweet: any) => ({
          text: tweet.text,
          media: tweet.media
        }));
        
        // Quote the post with a thread
        const result = await this.postService.quotePost(userId, postId, content);
        
        // Return the result
        return c.json({ data: result });
      } else {
        // It's a single quote tweet
        const schema = z.object({
          postId: z.string(),
          text: z.string().optional(),
          media: z.array(z.any()).optional()
        });
        
        const result = schema.safeParse(body);
        if (!result.success) {
          return c.json({ 
            error: {
              type: "validation_error",
              message: "Invalid request body",
              details: result.error
            }
          }, 400);
        }
        
        const { postId, ...content } = result.data;
        
        // Quote the post
        const quoteResult = await this.postService.quotePost(userId, postId, content);
        
        // Return the result
        return c.json({ data: quoteResult });
      }
    } catch (error) {
      console.error("Error quoting post:", error);
      return c.json({
        error: {
          type: "internal_error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
          status: 500
        }
      }, 500);
    }
  }
  
  /**
   * Delete a post
   * @param c The Hono context
   * @returns HTTP response
   */
  async deletePost(c: Context): Promise<Response> {
    try {
      // Extract user ID from context
      const userId = c.get("userId") as string;
      
      // Get the post ID from the URL
      const postId = c.req.param("id");
      if (!postId) {
        return c.json({ 
          error: {
            type: "validation_error",
            message: "Post ID is required"
          }
        }, 400);
      }
      
      // Delete the post
      const result = await this.postService.deletePost(userId, postId);
      
      // Return the result
      return c.json({ data: result });
    } catch (error) {
      console.error("Error deleting post:", error);
      return c.json({
        error: {
          type: "internal_error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
          status: 500
        }
      }, 500);
    }
  }
  
  /**
   * Reply to an existing post
   * @param c The Hono context
   * @returns HTTP response
   */
  async replyToPost(c: Context): Promise<Response> {
    try {
      // Extract user ID from context
      const userId = c.get("userId") as string;
      
      // Parse request body
      const body = await c.req.json();
      
      // Validate request body
      if (Array.isArray(body)) {
        // It's a thread of replies
        if (body.length === 0 || !body[0].postId) {
          return c.json({ 
            error: {
              type: "validation_error",
              message: "Thread must contain at least one tweet with a postId"
            }
          }, 400);
        }
        
        const postId = body[0].postId;
        const content = body.map((tweet: any) => ({
          text: tweet.text,
          media: tweet.media
        }));
        
        // Reply to the post with a thread
        const result = await this.postService.replyToPost(userId, postId, content);
        
        // Return the result
        return c.json({ data: result });
      } else {
        // It's a single reply
        const schema = z.object({
          postId: z.string(),
          text: z.string().optional(),
          media: z.array(z.any()).optional()
        });
        
        const result = schema.safeParse(body);
        if (!result.success) {
          return c.json({ 
            error: {
              type: "validation_error",
              message: "Invalid request body",
              details: result.error
            }
          }, 400);
        }
        
        const { postId, ...content } = result.data;
        
        // Reply to the post
        const replyResult = await this.postService.replyToPost(userId, postId, content);
        
        // Return the result
        return c.json({ data: replyResult });
      }
    } catch (error) {
      console.error("Error replying to post:", error);
      return c.json({
        error: {
          type: "internal_error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
          status: 500
        }
      }, 500);
    }
  }
  
  /**
   * Like a post
   * @param c The Hono context
   * @returns HTTP response
   */
  async likePost(c: Context): Promise<Response> {
    try {
      // Extract user ID from context
      const userId = c.get("userId") as string;
      
      // Get the post ID from the URL
      const postId = c.req.param("id");
      if (!postId) {
        return c.json({ 
          error: {
            type: "validation_error",
            message: "Post ID is required"
          }
        }, 400);
      }
      
      // Like the post
      const result = await this.postService.likePost(userId, postId);
      
      // Return the result
      return c.json({ data: result });
    } catch (error) {
      console.error("Error liking post:", error);
      return c.json({
        error: {
          type: "internal_error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
          status: 500
        }
      }, 500);
    }
  }
  
  /**
   * Unlike a post
   * @param c The Hono context
   * @returns HTTP response
   */
  async unlikePost(c: Context): Promise<Response> {
    try {
      // Extract user ID from context
      const userId = c.get("userId") as string;
      
      // Get the post ID from the URL
      const postId = c.req.param("id");
      if (!postId) {
        return c.json({ 
          error: {
            type: "validation_error",
            message: "Post ID is required"
          }
        }, 400);
      }
      
      // Unlike the post
      const result = await this.postService.unlikePost(userId, postId);
      
      // Return the result
      return c.json({ data: result });
    } catch (error) {
      console.error("Error unliking post:", error);
      return c.json({
        error: {
          type: "internal_error",
          message: error instanceof Error ? error.message : "An unexpected error occurred",
          status: 500
        }
      }, 500);
    }
  }
}
