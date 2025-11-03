import { z } from 'every-plugin/zod';
import { AuthenticatedRequest } from './auth';

/**
 * Upload media input schema
 */
export const UploadMediaInputSchema = AuthenticatedRequest.extend({
  media: z.object({
    data: z.union([z.string(), z.instanceof(Blob)]).describe('Media data as string or Blob'),
    mimeType: z.string().optional().describe('Media MIME type'),
    altText: z.string().optional().describe('Alt text for the media'),
  }).describe('Media content to upload'),
  additionalOwners: z.array(z.string()).optional().describe('Additional user IDs who can use this media'),
});
export type UploadMediaInput = z.infer<typeof UploadMediaInputSchema>;

/**
 * Get media status input schema
 */
export const GetMediaStatusInputSchema = AuthenticatedRequest.extend({
  mediaId: z.string().describe('ID of the media to check'),
});
export type GetMediaStatusInput = z.infer<typeof GetMediaStatusInputSchema>;

/**
 * Update media metadata input schema
 */
export const UpdateMediaMetadataInputSchema = AuthenticatedRequest.extend({
  mediaId: z.string().describe('ID of the media to update'),
  altText: z.string().describe('Alt text to set for the media'),
});
export type UpdateMediaMetadataInput = z.infer<typeof UpdateMediaMetadataInputSchema>;

/**
 * Media upload result schema
 */
export const MediaUploadResultSchema = z.object({
  mediaId: z.string().describe('ID of the uploaded media'),
  processingInfo: z.object({
    state: z.string().describe('Processing state'),
    checkAfterSecs: z.number().optional().describe('Seconds to wait before checking status'),
    progressPercent: z.number().optional().describe('Processing progress percentage'),
    error: z.object({
      code: z.string().describe('Error code'),
      message: z.string().describe('Error message'),
    }).optional().describe('Processing error'),
  }).optional().describe('Processing information'),
}).describe('Media upload result');
export type MediaUploadResult = z.infer<typeof MediaUploadResultSchema>;

/**
 * Media status result schema
 */
export const MediaStatusResultSchema = z.object({
  mediaId: z.string().describe('ID of the media'),
  state: z.string().describe('Processing state'),
  processingComplete: z.boolean().describe('Whether processing is complete'),
  progressPercent: z.number().optional().describe('Processing progress percentage'),
  error: z.object({
    code: z.string().describe('Error code'),
    message: z.string().describe('Error message'),
  }).optional().describe('Processing error'),
}).describe('Media status result');
export type MediaStatusResult = z.infer<typeof MediaStatusResultSchema>;
