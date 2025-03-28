import { Context } from "../../deps.ts";
import { PostService } from "../domain/services/post.service.ts";
import { getEnv } from "../config/env.ts";
import { z } from "zod";
import { PostContent } from "../infrastructure/platform/abstract/platform-post.interface.ts";
import { NearAuthService } from "../infrastructure/security/near-auth/near-auth.service.ts";

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
      // Extract NEAR account ID from the validated signature
      const signerId = c.get("signerId") as string;
      
      // Parse request body
      const body = await c.req.json();
      
      // Initialize NEAR auth service
      const env = getEnv();
      const nearAuthService = new NearAuthService(env);
      
      // Check if we're dealing with multiple targets or a single target
      if (Array.isArray(body.targets)) {
        // Multiple targets
        const results: Array<{platform: string, userId: string, result: any}> = [];
        const errors: Array<{platform?: string, userId?: string, error: string}> = [];
        
        for (const target of body.targets) {
          try {
            const { platform, userId } = target;
            
            if (!platform || !userId) {
              errors.push({
                error: "Missing platform or userId in target"
              });
              continue;
            }
            
            // Check if the NEAR account has a token for this platform and userId
            const token = await nearAuthService.getToken(signerId, platform, userId);
            
            if (!token) {
              errors.push({
                platform,
                userId,
                error: `No connected ${platform} account found for user ID ${userId}`
              });
              continue;
            }
            
            // Process the content
            let processedContent: PostContent | PostContent[];
            
            if (Array.isArray(body.content)) {
              // It's a thread
              processedContent = body.content.map((item: any) => ({
                text: item.text || "",
                media: item.media
              }));
            } else if (typeof body.content === "string") {
              // It's a simple string post
              processedContent = { text: body.content };
            } else {
              // It's an object
              processedContent = {
                text: body.content.text || "",
                media: body.content.media
              };
            }
            
            // Create the post
            const result = await this.postService.createPost(platform, userId, processedContent);
            
            results.push({
              platform,
              userId,
              result
            });
          } catch (error) {
            errors.push({
              platform: target.platform,
              userId: target.userId,
              error: error instanceof Error ? error.message : "An unexpected error occurred"
            });
          }
        }
        
        // Return the combined results
        return c.json({ 
          data: { 
            results,
            errors: errors.length > 0 ? errors : undefined
          } 
        });
      } else {
        // Single target
        const { platform, userId, content } = body;
        
        if (!platform || !userId) {
          return c.json({ 
            error: {
              type: "validation_error",
              message: "Missing platform or userId in request"
            }
          }, 400);
        }
        
        // Check if the NEAR account has a token for this platform and userId
        const token = await nearAuthService.getToken(signerId, platform, userId);
        
        if (!token) {
          return c.json({
            error: {
              type: "authentication_error",
              message: `No connected ${platform} account found for user ID ${userId}`,
              status: 401
            }
          }, 401);
        }
        
        // Process the content
        let processedContent: PostContent | PostContent[];
        
        if (Array.isArray(content)) {
          // It's a thread
          processedContent = content.map((item: any) => ({
            text: item.text || "",
            media: item.media
          }));
        } else if (typeof content === "string") {
          // It's a simple string post
          processedContent = { text: content };
        } else {
          // It's an object
          processedContent = {
            text: content.text || "",
            media: content.media
          };
        }
        
        // Create the post
        const result = await this.postService.createPost(platform, userId, processedContent);
        
        // Return the result
        return c.json({ data: result });
      }
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
      // Extract NEAR account ID from the validated signature
      const signerId = c.get("signerId") as string;
      
      // Parse request body
      const body = await c.req.json();
      
      // Validate request body
      const schema = z.object({
        platform: z.string(),
        userId: z.string(),
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
      
      // Initialize NEAR auth service
      const env = getEnv();
      const nearAuthService = new NearAuthService(env);
      
      // Check if the NEAR account has a token for this platform and userId
      const token = await nearAuthService.getToken(signerId, result.data.platform, result.data.userId);
      
      if (!token) {
        return c.json({
          error: {
            type: "authentication_error",
            message: `No connected ${result.data.platform} account found for user ID ${result.data.userId}`,
            status: 401
          }
        }, 401);
      }
      
      // Repost the post
      const repostResult = await this.postService.repost(result.data.platform, result.data.userId, result.data.postId);
      
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
      // Extract NEAR account ID from the validated signature
      const signerId = c.get("signerId") as string;
      
      // Parse request body
      const body = await c.req.json();
      
      // Initialize NEAR auth service
      const env = getEnv();
      const nearAuthService = new NearAuthService(env);
      
      // Validate request body
      if (Array.isArray(body)) {
        // It's a thread of quote tweets
        if (body.length === 0 || !body[0].postId || !body[0].platform || !body[0].userId) {
          return c.json({ 
            error: {
              type: "validation_error",
              message: "Thread must contain at least one tweet with platform, userId, and postId"
            }
          }, 400);
        }
        
        const { platform, userId, postId } = body[0];
        
        // Check if the NEAR account has a token for this platform and userId
        const token = await nearAuthService.getToken(signerId, platform, userId);
        
        if (!token) {
          return c.json({
            error: {
              type: "authentication_error",
              message: `No connected ${platform} account found for user ID ${userId}`,
              status: 401
            }
          }, 401);
        }
        
        const content = body.map((tweet: any) => ({
          text: tweet.text,
          media: tweet.media
        }));
        
        // Quote the post with a thread
        const result = await this.postService.quotePost(platform, userId, postId, content);
        
        // Return the result
        return c.json({ data: result });
      } else {
        // It's a single quote tweet
        const schema = z.object({
          platform: z.string(),
          userId: z.string(),
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
        
        // Check if the NEAR account has a token for this platform and userId
        const token = await nearAuthService.getToken(signerId, result.data.platform, result.data.userId);
        
        if (!token) {
          return c.json({
            error: {
              type: "authentication_error",
              message: `No connected ${result.data.platform} account found for user ID ${result.data.userId}`,
              status: 401
            }
          }, 401);
        }
        
        const { platform, userId, postId, ...content } = result.data;
        
        // Quote the post
        const quoteResult = await this.postService.quotePost(platform, userId, postId, content);
        
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
      // Extract NEAR account ID from the validated signature
      const signerId = c.get("signerId") as string;
      
      // Parse request body
      const body = await c.req.json();
      
      // Validate request body
      const schema = z.object({
        platform: z.string(),
        userId: z.string(),
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
      
      // Initialize NEAR auth service
      const env = getEnv();
      const nearAuthService = new NearAuthService(env);
      
      // Check if the NEAR account has a token for this platform and userId
      const token = await nearAuthService.getToken(signerId, result.data.platform, result.data.userId);
      
      if (!token) {
        return c.json({
          error: {
            type: "authentication_error",
            message: `No connected ${result.data.platform} account found for user ID ${result.data.userId}`,
            status: 401
          }
        }, 401);
      }
      
      // Delete the post
      const deleteResult = await this.postService.deletePost(result.data.platform, result.data.userId, result.data.postId);
      
      // Return the result
      return c.json({ data: deleteResult });
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
      // Extract NEAR account ID from the validated signature
      const signerId = c.get("signerId") as string;
      
      // Parse request body
      const body = await c.req.json();
      
      // Initialize NEAR auth service
      const env = getEnv();
      const nearAuthService = new NearAuthService(env);
      
      // Validate request body
      if (Array.isArray(body)) {
        // It's a thread of replies
        if (body.length === 0 || !body[0].postId || !body[0].platform || !body[0].userId) {
          return c.json({ 
            error: {
              type: "validation_error",
              message: "Thread must contain at least one tweet with platform, userId, and postId"
            }
          }, 400);
        }
        
        const { platform, userId, postId } = body[0];
        
        // Check if the NEAR account has a token for this platform and userId
        const token = await nearAuthService.getToken(signerId, platform, userId);
        
        if (!token) {
          return c.json({
            error: {
              type: "authentication_error",
              message: `No connected ${platform} account found for user ID ${userId}`,
              status: 401
            }
          }, 401);
        }
        
        const content = body.map((tweet: any) => ({
          text: tweet.text,
          media: tweet.media
        }));
        
        // Reply to the post with a thread
        const result = await this.postService.replyToPost(platform, userId, postId, content);
        
        // Return the result
        return c.json({ data: result });
      } else {
        // It's a single reply
        const schema = z.object({
          platform: z.string(),
          userId: z.string(),
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
        
        // Check if the NEAR account has a token for this platform and userId
        const token = await nearAuthService.getToken(signerId, result.data.platform, result.data.userId);
        
        if (!token) {
          return c.json({
            error: {
              type: "authentication_error",
              message: `No connected ${result.data.platform} account found for user ID ${result.data.userId}`,
              status: 401
            }
          }, 401);
        }
        
        const { platform, userId, postId, ...content } = result.data;
        
        // Reply to the post
        const replyResult = await this.postService.replyToPost(platform, userId, postId, content);
        
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
      // Extract NEAR account ID from the validated signature
      const signerId = c.get("signerId") as string;
      
      // Parse request body
      const body = await c.req.json();
      
      // Validate request body
      const schema = z.object({
        platform: z.string(),
        userId: z.string(),
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
      
      // Initialize NEAR auth service
      const env = getEnv();
      const nearAuthService = new NearAuthService(env);
      
      // Check if the NEAR account has a token for this platform and userId
      const token = await nearAuthService.getToken(signerId, result.data.platform, result.data.userId);
      
      if (!token) {
        return c.json({
          error: {
            type: "authentication_error",
            message: `No connected ${result.data.platform} account found for user ID ${result.data.userId}`,
            status: 401
          }
        }, 401);
      }
      
      // Like the post
      const likeResult = await this.postService.likePost(result.data.platform, result.data.userId, result.data.postId);
      
      // Return the result
      return c.json({ data: likeResult });
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
      // Extract NEAR account ID from the validated signature
      const signerId = c.get("signerId") as string;
      
      // Parse request body
      const body = await c.req.json();
      
      // Validate request body
      const schema = z.object({
        platform: z.string(),
        userId: z.string(),
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
      
      // Initialize NEAR auth service
      const env = getEnv();
      const nearAuthService = new NearAuthService(env);
      
      // Check if the NEAR account has a token for this platform and userId
      const token = await nearAuthService.getToken(signerId, result.data.platform, result.data.userId);
      
      if (!token) {
        return c.json({
          error: {
            type: "authentication_error",
            message: `No connected ${result.data.platform} account found for user ID ${result.data.userId}`,
            status: 401
          }
        }, 401);
      }
      
      // Unlike the post
      const unlikeResult = await this.postService.unlikePost(result.data.platform, result.data.userId, result.data.postId);
      
      // Return the result
      return c.json({ data: unlikeResult });
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
