/**
 * Response schemas for media-related endpoints
 */

import { z } from 'zod';
import { enhancedResponseSchema } from '../zod/index.ts';
import { platformSchema } from '../zod/common.schemas.ts';

/**
 * Media upload response schema
 */
export const mediaUploadResponseSchema = enhancedResponseSchema(
  z.object({
    mediaId: z.string().describe('Media ID'),
    platform: platformSchema,
    type: z.enum(['image', 'video', 'gif', 'audio']).describe('Media type'),
    status: z.enum(['pending', 'processing', 'failed', 'succeeded']).describe('Media processing status'),
    size: z.number().optional().describe('Media size in bytes'),
    width: z.number().optional().describe('Media width in pixels'),
    height: z.number().optional().describe('Media height in pixels'),
    duration: z.number().optional().describe('Media duration in seconds'),
    url: z.string().optional().describe('Media URL'),
    altText: z.string().optional().describe('Alt text for the media'),
    expiresAt: z.string().optional().describe('When the media expires'),
  }),
);

/**
 * Media status response schema
 */
export const mediaStatusResponseSchema = enhancedResponseSchema(
  z.object({
    mediaId: z.string().describe('Media ID'),
    platform: platformSchema,
    status: z.enum(['pending', 'processing', 'failed', 'succeeded']).describe('Media processing status'),
    progress: z.number().optional().describe('Media processing progress (0-100)'),
    error: z.string().optional().describe('Error message if processing failed'),
    url: z.string().optional().describe('Media URL'),
  }),
);

/**
 * Media metadata update response schema
 */
export const mediaMetadataUpdateResponseSchema = enhancedResponseSchema(
  z.object({
    mediaId: z.string().describe('Media ID'),
    platform: platformSchema,
    success: z.boolean().describe('Whether the update was successful'),
    altText: z.string().optional().describe('Updated alt text for the media'),
  }),
);
