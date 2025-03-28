import { z } from 'zod';

/**
 * Media Validation Schemas
 * Defines validation schemas for media-related requests
 */

/**
 * Media Upload Schema (JSON)
 * Validates the request to upload media via JSON
 */
export const MediaUploadJsonSchema = z.object({
  data: z.string({
    required_error: 'Media data is required',
  }).describe('Base64 encoded media data'),
  mimeType: z.string({
    required_error: 'MIME type is required',
  }),
  altText: z.string().optional(),
});

/**
 * Media Upload Form Schema
 * Validates the request to upload media via form data
 * Note: This is used for validation logic, not for parsing form data
 */
export const MediaUploadFormSchema = z.object({
  media: z.any({
    required_error: 'Media file is required',
  }),
  mimeType: z.string().optional(),
  altText: z.string().optional(),
});

/**
 * Media Status Schema
 * Validates the request to get media status
 */
export const MediaStatusSchema = z.object({
  id: z.string({
    required_error: 'Media ID is required',
  }),
});

/**
 * Media Metadata Update Schema
 * Validates the request to update media metadata
 */
export const MediaMetadataUpdateSchema = z.object({
  id: z.string({
    required_error: 'Media ID is required',
  }),
  altText: z.string({
    required_error: 'Alt text is required',
  }),
});

/**
 * Supported Media Types
 * List of supported media MIME types
 */
export const SUPPORTED_MEDIA_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  
  // Videos
  'video/mp4',
  'video/quicktime',
  'video/webm',
  
  // Animated GIFs
  'image/gif',
];

/**
 * Media Size Limits (in bytes)
 */
export const MEDIA_SIZE_LIMITS = {
  // Images: 5MB
  image: 5 * 1024 * 1024,
  
  // Videos: 512MB
  video: 512 * 1024 * 1024,
  
  // Animated GIFs: 15MB
  gif: 15 * 1024 * 1024,
};

/**
 * Validate Media Type
 * Checks if a MIME type is supported
 * @param mimeType The MIME type to check
 * @returns True if the MIME type is supported
 */
export function isValidMediaType(mimeType: string): boolean {
  return SUPPORTED_MEDIA_TYPES.includes(mimeType);
}

/**
 * Validate Media Size
 * Checks if a media file size is within limits
 * @param size The size of the media file in bytes
 * @param mimeType The MIME type of the media
 * @returns True if the size is within limits
 */
export function isValidMediaSize(size: number, mimeType: string): boolean {
  if (mimeType.startsWith('image/')) {
    if (mimeType === 'image/gif') {
      return size <= MEDIA_SIZE_LIMITS.gif;
    }
    return size <= MEDIA_SIZE_LIMITS.image;
  }
  
  if (mimeType.startsWith('video/')) {
    return size <= MEDIA_SIZE_LIMITS.video;
  }
  
  return false;
}
