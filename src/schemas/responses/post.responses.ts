/**
 * Response schemas for post-related endpoints
 */

import { z } from 'zod';
import { enhancedResponseSchema, errorDetailSchema } from '../zod/index.ts';
import { platformSchema } from '../zod/common.schemas.ts';

/**
 * Media object schema
 */
export const mediaSchema = z.object({
  id: z.string().describe('Media ID'),
  type: z.enum(['image', 'video', 'gif']).describe('Media type'),
  url: z.string().optional().describe('Media URL'),
  altText: z.string().optional().describe('Alt text for the media'),
});

/**
 * Post metrics schema
 */
export const postMetricsSchema = z.object({
  retweets: z.number().describe('Number of retweets'),
  quotes: z.number().describe('Number of quotes'),
  likes: z.number().describe('Number of likes'),
  replies: z.number().describe('Number of replies'),
});

/**
 * Post object schema
 */
export const postSchema = z.object({
  id: z.string().describe('Post ID'),
  text: z.string().describe('Post text content'),
  createdAt: z.string().describe('Post creation date'),
  authorId: z.string().describe('Author ID'),
  media: z.array(mediaSchema).optional().describe('Media attached to the post'),
  metrics: postMetricsSchema.optional().describe('Post metrics'),
  inReplyToId: z.string().optional().describe('ID of the post this is a reply to'),
  quotedPostId: z.string().optional().describe('ID of the post this is quoting'),
});

/**
 * Success detail schema for post operations
 */
export const postSuccessDetailSchema = z.object({
  platform: platformSchema,
  userId: z.string().describe('User ID'),
  status: z.literal('success'),
  postId: z.string().optional().describe('Post ID'),
  postUrl: z.string().optional().describe('URL to the post'),
}).catchall(z.any());

/**
 * Post response schema
 */
export const postResponseSchema = enhancedResponseSchema(
  z.union([postSchema, z.array(postSchema)]),
);

/**
 * Create post response schema
 */
export const createPostResponseSchema = postResponseSchema;

/**
 * Repost response schema
 */
export const repostResponseSchema = postResponseSchema;

/**
 * Quote post response schema
 */
export const quotePostResponseSchema = postResponseSchema;

/**
 * Reply to post response schema
 */
export const replyToPostResponseSchema = postResponseSchema;

/**
 * Delete post response schema
 */
export const deletePostResponseSchema = enhancedResponseSchema(
  z.object({
    success: z.boolean().describe('Whether the deletion was successful'),
    id: z.string().describe('ID of the deleted post'),
  }),
);

/**
 * Like post response schema
 */
export const likePostResponseSchema = enhancedResponseSchema(
  z.object({
    success: z.boolean().describe('Whether the like was successful'),
    id: z.string().describe('ID of the liked post'),
  }),
);

/**
 * Unlike post response schema
 */
export const unlikePostResponseSchema = enhancedResponseSchema(
  z.object({
    success: z.boolean().describe('Whether the unlike was successful'),
    id: z.string().describe('ID of the unliked post'),
  }),
);

/**
 * Multi-status response schema for batch operations
 */
export const multiStatusResponseSchema = z.object({
  success: z.boolean().describe('Whether the operation was partially or fully successful'),
  data: z.object({
    summary: z.object({
      total: z.number().describe('Total number of operations'),
      succeeded: z.number().describe('Number of successful operations'),
      failed: z.number().describe('Number of failed operations'),
    }),
    results: z.array(postSuccessDetailSchema).describe('Successful operations'),
    errors: z.array(errorDetailSchema).describe('Failed operations'),
  }),
});
