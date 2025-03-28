import { MediaService } from '../../domain/services/media.service';
import { Env } from '../../config/env';
import { ExtendedRequest } from '../../types/request.types';
import { z } from 'zod';
import { MediaContent } from '../../infrastructure/platform/abstract/platform-post.interface';

/**
 * Media Controller
 * Handles HTTP requests for media-related operations
 */
export class MediaController {
  private mediaService: MediaService;
  
  constructor(env: Env) {
    this.mediaService = new MediaService(env);
  }
  
  /**
   * Upload media
   * @param request The HTTP request
   * @returns HTTP response with media upload result
   */
  async uploadMedia(request: ExtendedRequest): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = request.headers.get('X-User-ID');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Check content type
      const contentType = request.headers.get('Content-Type') || '';
      
      let media: MediaContent;
      
      if (contentType.includes('multipart/form-data')) {
        // Handle form data
        const formData = await request.formData();
        media = this.mediaService.parseMediaFromFormData(formData);
      } else {
        // Handle JSON
        const body: any = await request.json().catch(() => ({}));
        
        // Validate request body
        const schema = z.object({
          data: z.string(), // Base64 encoded data
          mimeType: z.string(),
          altText: z.string().optional()
        });
        
        const result = schema.safeParse(body);
        if (!result.success) {
          return new Response(JSON.stringify({ error: 'Invalid request body', details: result.error }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        media = result.data;
      }
      
      // Upload media
      const uploadResult = await this.mediaService.uploadMedia(userId, media);
      
      // Return the upload result
      return this.mediaService.createResponse(uploadResult);
    } catch (error) {
      console.error('Error uploading media:', error);
      return this.mediaService.createErrorResponse(error, 500);
    }
  }
  
  /**
   * Get media status
   * @param request The HTTP request
   * @returns HTTP response with media status
   */
  async getMediaStatus(request: ExtendedRequest): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = request.headers.get('X-User-ID');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Get the media ID from the URL
      const mediaId = request.params?.id;
      if (!mediaId) {
        return new Response(JSON.stringify({ error: 'Media ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Get media status
      const statusResult = await this.mediaService.getMediaStatus(userId, mediaId);
      
      // Return the status result
      return this.mediaService.createResponse(statusResult);
    } catch (error) {
      console.error('Error getting media status:', error);
      return this.mediaService.createErrorResponse(error, 500);
    }
  }
  
  /**
   * Update media metadata (e.g., alt text)
   * @param request The HTTP request
   * @returns HTTP response with update result
   */
  async updateMediaMetadata(request: ExtendedRequest): Promise<Response> {
    try {
      // Extract user ID from headers
      const userId = request.headers.get('X-User-ID');
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Get the media ID from the URL
      const mediaId = request.params?.id;
      if (!mediaId) {
        return new Response(JSON.stringify({ error: 'Media ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Parse request body
      const body: any = await request.json();
      
      // Validate request body
      const schema = z.object({
        altText: z.string()
      });
      
      const result = schema.safeParse(body);
      if (!result.success) {
        return new Response(JSON.stringify({ error: 'Invalid request body', details: result.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Update media metadata
      const updateResult = await this.mediaService.updateMediaMetadata(userId, mediaId, result.data.altText);
      
      // Return the update result
      return this.mediaService.createResponse({ success: updateResult });
    } catch (error) {
      console.error('Error updating media metadata:', error);
      return this.mediaService.createErrorResponse(error, 500);
    }
  }
}
