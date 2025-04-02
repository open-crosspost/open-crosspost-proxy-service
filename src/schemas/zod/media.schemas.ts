import { z } from '../../../deps.ts';

/**
 * Media Schemas
 * Defines Zod schemas for media-related requests and responses with OpenAPI metadata
 * Also exports TypeScript types derived from Zod schemas for type safety
 */

// Media upload request schema
export const MediaUploadRequestSchema = z.object({
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  userId: z.string().openapi({
    description: 'User ID on the platform',
    example: 'user123'
  }),
  mediaType: z.enum(['image', 'video', 'gif']).openapi({
    description: 'Type of media being uploaded',
    example: 'image'
  }),
  mimeType: z.string().openapi({
    description: 'MIME type of the media',
    example: 'image/jpeg'
  }),
  // For base64 encoded media
  mediaData: z.string().optional().openapi({
    description: 'Base64 encoded media data (required if mediaUrl is not provided)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'
  }),
  // For media URL
  mediaUrl: z.string().url().optional().openapi({
    description: 'URL of the media to upload (required if mediaData is not provided)',
    example: 'https://example.com/image.jpg'
  }),
  // Optional metadata
  altText: z.string().optional().openapi({
    description: 'Alternative text for accessibility',
    example: 'A beautiful sunset over the mountains'
  })
}).refine(
  (data) => data.mediaData !== undefined || data.mediaUrl !== undefined,
  {
    message: 'Either mediaData or mediaUrl must be provided',
    path: ['mediaData', 'mediaUrl']
  }
).openapi('MediaUploadRequest');

// Media upload response schema
export const MediaUploadResponseSchema = z.object({
  mediaId: z.string().openapi({
    description: 'ID of the uploaded media',
    example: '1234567890'
  }),
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).openapi({
    description: 'Status of the media upload',
    example: 'completed'
  }),
  expiresAt: z.string().datetime().optional().openapi({
    description: 'Timestamp when the media will expire (if applicable)',
    example: '2023-01-01T12:00:00Z'
  })
}).openapi('MediaUploadResponse');

// Media status request schema (params)
export const MediaStatusParamsSchema = z.object({
  id: z.string().openapi({
    description: 'Media ID',
    example: '1234567890'
  })
}).openapi('MediaStatusParams');

// Media status request schema (query)
export const MediaStatusQuerySchema = z.object({
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  userId: z.string().openapi({
    description: 'User ID on the platform',
    example: 'user123'
  })
}).openapi('MediaStatusQuery');

// Media status response schema
export const MediaStatusResponseSchema = z.object({
  mediaId: z.string().openapi({
    description: 'ID of the media',
    example: '1234567890'
  }),
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).openapi({
    description: 'Status of the media',
    example: 'completed'
  }),
  url: z.string().url().optional().openapi({
    description: 'URL of the media (if available)',
    example: 'https://example.com/image.jpg'
  }),
  error: z.string().optional().openapi({
    description: 'Error message (if status is failed)',
    example: 'File size exceeds platform limit'
  }),
  expiresAt: z.string().datetime().optional().openapi({
    description: 'Timestamp when the media will expire (if applicable)',
    example: '2023-01-01T12:00:00Z'
  })
}).openapi('MediaStatusResponse');

// Media metadata update request schema (params)
export const MediaMetadataParamsSchema = z.object({
  id: z.string().openapi({
    description: 'Media ID',
    example: '1234567890'
  })
}).openapi('MediaMetadataParams');

// Media metadata update request schema (body)
export const MediaMetadataRequestSchema = z.object({
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  userId: z.string().openapi({
    description: 'User ID on the platform',
    example: 'user123'
  }),
  altText: z.string().optional().openapi({
    description: 'Alternative text for accessibility',
    example: 'A beautiful sunset over the mountains'
  }),
  title: z.string().optional().openapi({
    description: 'Title of the media (if supported by platform)',
    example: 'Sunset at the beach'
  }),
  description: z.string().optional().openapi({
    description: 'Description of the media (if supported by platform)',
    example: 'A beautiful sunset captured at the beach'
  })
}).openapi('MediaMetadataRequest');

// Media metadata update response schema
export const MediaMetadataResponseSchema = z.object({
  mediaId: z.string().openapi({
    description: 'ID of the media',
    example: '1234567890'
  }),
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  success: z.boolean().openapi({
    description: 'Whether the metadata update was successful',
    example: true
  }),
  updatedFields: z.array(z.string()).openapi({
    description: 'List of fields that were updated',
    example: ['altText', 'title']
  })
}).openapi('MediaMetadataResponse');

// Export TypeScript types derived from Zod schemas
export type MediaUploadRequest = z.infer<typeof MediaUploadRequestSchema>;
export type MediaUploadResponse = z.infer<typeof MediaUploadResponseSchema>;
export type MediaStatusParams = z.infer<typeof MediaStatusParamsSchema>;
export type MediaStatusQuery = z.infer<typeof MediaStatusQuerySchema>;
export type MediaStatusResponse = z.infer<typeof MediaStatusResponseSchema>;
export type MediaMetadataParams = z.infer<typeof MediaMetadataParamsSchema>;
export type MediaMetadataRequest = z.infer<typeof MediaMetadataRequestSchema>;
export type MediaMetadataResponse = z.infer<typeof MediaMetadataResponseSchema>;
