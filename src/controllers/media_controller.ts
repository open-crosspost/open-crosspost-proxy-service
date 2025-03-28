import { Context } from "../../deps.ts";
import { MediaService } from "../domain/services/media.service.ts";
import { getEnv } from "../config/env.ts";
import { z } from "../../deps.ts";

/**
 * Media Controller
 * Handles HTTP requests for media-related operations
 */
export class MediaController {
  private mediaService: MediaService;
  
  constructor() {
    const env = getEnv();
    this.mediaService = new MediaService(env);
  }
  
  /**
   * Upload media
   * @param c The Hono context
   * @returns HTTP response
   */
  async uploadMedia(c: Context): Promise<Response> {
    try {
      // Extract user ID from context
      const userId = c.get("userId") as string;
      
      // Parse request body
      const body = await c.req.json();
      
      // Validate request body
      const schema = z.object({
        data: z.string(),
        mimeType: z.string().optional(),
        altText: z.string().optional()
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
      
      // Upload the media
      const uploadResult = await this.mediaService.uploadMedia(userId, result.data);
      
      // Return the result
      return c.json({ data: uploadResult });
    } catch (error) {
      console.error("Error uploading media:", error);
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
   * Get media status
   * @param c The Hono context
   * @returns HTTP response
   */
  async getMediaStatus(c: Context): Promise<Response> {
    try {
      // Extract user ID from context
      const userId = c.get("userId") as string;
      
      // Get the media ID from the URL
      const mediaId = c.req.param("id");
      if (!mediaId) {
        return c.json({ 
          error: {
            type: "validation_error",
            message: "Media ID is required"
          }
        }, 400);
      }
      
      // Get the media status
      const statusResult = await this.mediaService.getMediaStatus(userId, mediaId);
      
      // Return the result
      return c.json({ data: statusResult });
    } catch (error) {
      console.error("Error getting media status:", error);
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
   * Update media metadata
   * @param c The Hono context
   * @returns HTTP response
   */
  async updateMediaMetadata(c: Context): Promise<Response> {
    try {
      // Extract user ID from context
      const userId = c.get("userId") as string;
      
      // Get the media ID from the URL
      const mediaId = c.req.param("id");
      if (!mediaId) {
        return c.json({ 
          error: {
            type: "validation_error",
            message: "Media ID is required"
          }
        }, 400);
      }
      
      // Parse request body
      const body = await c.req.json();
      
      // Validate request body
      const schema = z.object({
        altText: z.string().optional()
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
      
      // Update the media metadata
      const updateResult = await this.mediaService.updateMediaMetadata(
        userId,
        mediaId,
        result.data.altText || ""
      );
      
      // Return the result
      return c.json({ data: updateResult });
    } catch (error) {
      console.error("Error updating media metadata:", error);
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
