/**
 * Media Schemas and Types
 * Defines Zod schemas for media-related requests and responses
 * TypeScript types are derived from Zod schemas for type safety
 */

import { z } from "zod";
import { EnhancedResponseSchema } from "./enhanced-response.ts";
import { PlatformSchema } from "./common.ts";

/**
 * Media upload request schema
 */
export const MediaUploadRequestSchema = z.object({
  platform: PlatformSchema,
  userId: z.string().describe('User ID on the platform'),
  mediaType: z.enum(['image', 'video', 'gif']).describe('Type of media being uploaded'),
  mimeType: z.string().describe('MIME type of the media'),
  // For base64 encoded media
  mediaData: z.string().optional().describe('Base64 encoded media data (required if mediaUrl is not provided)'),
  // For media URL
  mediaUrl: z.string().url().optional().describe('URL of the media to upload (required if mediaData is not provided)'),
  // Optional metadata
  altText: z.string().optional().describe('Alternative text for accessibility'),
}).refine(
  (data) => data.mediaData !== undefined || data.mediaUrl !== undefined,
  {
    message: 'Either mediaData or mediaUrl must be provided',
    path: ['mediaData', 'mediaUrl'],
  },
).describe('Media upload request');

/**
 * Media upload response schema
 */
export const MediaUploadResponseSchema = EnhancedResponseSchema(
  z.object({
    mediaId: z.string().describe('Media ID'),
    platform: PlatformSchema,
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
).describe('Media upload response');

/**
 * Media status params schema
 */
export const MediaStatusParamsSchema = z.object({
  id: z.string().describe('Media ID'),
}).describe('Media status params');

/**
 * Media status query schema
 */
export const MediaStatusQuerySchema = z.object({
  platform: PlatformSchema,
  userId: z.string().describe('User ID on the platform'),
}).describe('Media status query');

/**
 * Media status response schema
 */
export const MediaStatusResponseSchema = EnhancedResponseSchema(
  z.object({
    mediaId: z.string().describe('Media ID'),
    platform: PlatformSchema,
    status: z.enum(['pending', 'processing', 'failed', 'succeeded']).describe('Media processing status'),
    progress: z.number().optional().describe('Media processing progress (0-100)'),
    error: z.string().optional().describe('Error message if processing failed'),
    url: z.string().optional().describe('Media URL'),
  }),
).describe('Media status response');

/**
 * Media metadata params schema
 */
export const MediaMetadataParamsSchema = z.object({
  id: z.string().describe('Media ID'),
}).describe('Media metadata params');

/**
 * Media metadata request schema
 */
export const MediaMetadataRequestSchema = z.object({
  platform: PlatformSchema,
  userId: z.string().describe('User ID on the platform'),
  altText: z.string().optional().describe('Alternative text for accessibility'),
  title: z.string().optional().describe('Title of the media (if supported by platform)'),
  description: z.string().optional().describe('Description of the media (if supported by platform)'),
}).describe('Media metadata request');

/**
 * Media metadata update response schema
 */
export const MediaMetadataUpdateResponseSchema = EnhancedResponseSchema(
  z.object({
    mediaId: z.string().describe('Media ID'),
    platform: PlatformSchema,
    success: z.boolean().describe('Whether the update was successful'),
    altText: z.string().optional().describe('Updated alt text for the media'),
  }),
).describe('Media metadata update response');

// Derive TypeScript types from Zod schemas
export type MediaUploadRequest = z.infer<typeof MediaUploadRequestSchema>;
export type MediaUploadResponse = z.infer<typeof MediaUploadResponseSchema>;
export type MediaStatusParams = z.infer<typeof MediaStatusParamsSchema>;
export type MediaStatusQuery = z.infer<typeof MediaStatusQuerySchema>;
export type MediaStatusResponse = z.infer<typeof MediaStatusResponseSchema>;
export type MediaMetadataParams = z.infer<typeof MediaMetadataParamsSchema>;
export type MediaMetadataRequest = z.infer<typeof MediaMetadataRequestSchema>;
export type MediaMetadataUpdateResponse = z.infer<typeof MediaMetadataUpdateResponseSchema>;
