import { z } from 'every-plugin/zod';
import { AuthenticatedRequest } from './auth';

export const MediaContentSchema = z.object({
  data: z.union([z.string(), z.instanceof(Blob)]).describe('Media data as string or Blob'),
  mimeType: z.string().optional().describe('Media MIME type'),
  altText: z.string().optional().describe('Alt text for the media'),
}).describe('Media content object');
export type MediaContent = z.infer<typeof MediaContentSchema>;

export const PostContentSchema = z.object({
  text: z.string().optional().describe('Text content for the post'),
  media: z.array(MediaContentSchema).optional().describe('Media attachments for the post'),
}).describe('Post content');
export type PostContent = z.infer<typeof PostContentSchema>;

/**
 * Create post input schema
 */
export const CreatePostInputSchema = AuthenticatedRequest.extend({
  content: z.union([PostContentSchema, z.array(PostContentSchema)]),
});
export type CreatePostInput = z.infer<typeof CreatePostInputSchema>;

/**
 * Delete post input schema
 */
export const DeletePostInputSchema = AuthenticatedRequest.extend({
  postId: z.string(),
});
export type DeletePostInput = z.infer<typeof DeletePostInputSchema>;

/**
 * Repost input schema
 */
export const RepostInputSchema = AuthenticatedRequest.extend({
  postId: z.string(),
});
export type RepostInput = z.infer<typeof RepostInputSchema>;

/**
 * Quote post input schema
 */
export const QuotePostInputSchema = AuthenticatedRequest.extend({
  postId: z.string(),
  content: z.union([PostContentSchema, z.array(PostContentSchema)]),
});
export type QuotePostInput = z.infer<typeof QuotePostInputSchema>;

/**
 * Reply to post input schema
 */
export const ReplyInputSchema = AuthenticatedRequest.extend({
  postId: z.string(),
  content: z.union([PostContentSchema, z.array(PostContentSchema)]),
});
export type ReplyInput = z.infer<typeof ReplyInputSchema>;

/**
 * Like post input schema
 */
export const LikeInputSchema = AuthenticatedRequest.extend({
  postId: z.string(),
});
export type LikeInput = z.infer<typeof LikeInputSchema>;

/**
 * Unlike post input schema
 */
export const UnlikeInputSchema = AuthenticatedRequest.extend({
  postId: z.string(),
});
export type UnlikeInput = z.infer<typeof UnlikeInputSchema>;

export const PostResultSchema = z.object({
  id: z.string().describe('Post ID'),
  text: z.string().optional().describe('Post text content'),
  createdAt: z.string().describe('Post creation date'),
  mediaIds: z.array(z.string()).optional().describe('Media IDs attached to the post'),
  threadIds: z.array(z.string()).optional().describe('Thread IDs for threaded posts'),
  quotedPostId: z.string().optional().describe('ID of the post this is quoting'),
  inReplyToId: z.string().optional().describe('ID of the post this is a reply to'),
  success: z.boolean().optional().describe('Whether the operation was successful'),
}).catchall(z.any()).describe('Post result');
export type PostResult = z.infer<typeof PostResultSchema>;

export const DeleteResultSchema = z.object({
  success: z.boolean().describe('Whether the deletion was successful'),
  id: z.string().describe('ID of the deleted post'),
}).describe('Delete result');
export type DeleteResult = z.infer<typeof DeleteResultSchema>;

export const LikeResultSchema = z.object({
  success: z.boolean().describe('Whether the like was successful'),
  id: z.string().describe('ID of the liked post'),
}).describe('Like result');
export type LikeResult = z.infer<typeof LikeResultSchema>;
