import { z } from 'zod';
import { PlatformSchema } from './common.ts';

export const MediaContentSchema = z.object({
  data: z.union([z.string(), z.instanceof(Blob)]).describe('Media data as string or Blob'),
  mimeType: z.string().optional().describe('Media MIME type'),
  altText: z.string().optional().describe('Alt text for the media'),
}).describe('Media content object');

export const MediaSchema = z.object({
  id: z.string().describe('Media ID'),
  type: z.enum(['image', 'video', 'gif']).describe('Media type'),
  url: z.string().optional().describe('Media URL'),
  altText: z.string().optional().describe('Alt text for the media'),
}).describe('Media object');

export const PostMetricsSchema = z.object({
  retweets: z.number().describe('Number of retweets'),
  quotes: z.number().describe('Number of quotes'),
  likes: z.number().describe('Number of likes'),
  replies: z.number().describe('Number of replies'),
}).describe('Post metrics');

export const PostSchema = z.object({
  id: z.string().describe('Post ID'),
  text: z.string().describe('Post text content'),
  createdAt: z.string().describe('Post creation date'),
  authorId: z.string().describe('Author ID'),
  media: z.array(MediaSchema).optional().describe('Media attached to the post'),
  metrics: PostMetricsSchema.optional().describe('Post metrics'),
  inReplyToId: z.string().optional().describe('ID of the post this is a reply to'),
  quotedPostId: z.string().optional().describe('ID of the post this is quoting'),
}).describe('Post object');

export const PostContentSchema = z.object({
  text: z.string().optional().describe('Text content for the post'),
  media: z.array(MediaContentSchema).optional().describe('Media attachments for the post'),
}).describe('Post content');

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

export const DeleteResultSchema = z.object({
  success: z.boolean().describe('Whether the deletion was successful'),
  id: z.string().describe('ID of the deleted post'),
}).describe('Delete result');

export const LikeResultSchema = z.object({
  success: z.boolean().describe('Whether the like was successful'),
  id: z.string().describe('ID of the liked post'),
}).describe('Like result');

export const TargetSchema = z.object({
  platform: PlatformSchema.describe('The platform to post to (e.g., "twitter")'),
  userId: z.string().describe('User ID on the platform'),
}).describe('Target for posting operations');

export const CreatePostRequestSchema = z.object({
  targets: z.array(TargetSchema).describe('Array of targets to post to (can be a single target)'),
  content: z.array(PostContentSchema).describe(
    'The content of the post, always an array of PostContent objects, even for a single post',
  ),
}).describe('Create post request');

export const RepostRequestSchema = z.object({
  targets: z.array(TargetSchema).describe('Array of targets to post to'),
  platform: PlatformSchema.describe('Platform of the post being reposted'),
  postId: z.string().describe('ID of the post to repost'),
}).describe('Repost request');

export const QuotePostRequestSchema = z.object({
  targets: z.array(TargetSchema).describe(
    'Array of targets to post to (must be on the same platform as the post being quoted)',
  ),
  platform: PlatformSchema.describe('Platform of the post being quoted'),
  postId: z.string().describe('ID of the post to quote'),
  content: z.array(PostContentSchema).describe(
    'Content for the quote post(s), always an array, even for a single post',
  ),
}).describe('Quote post request');

export const ReplyToPostRequestSchema = z.object({
  targets: z.array(TargetSchema).describe(
    'Array of targets to post to (must be on the same platform as the post being replied to)',
  ),
  platform: PlatformSchema.describe('Platform of the post being replied to'),
  postId: z.string().describe('ID of the post to reply to'),
  content: z.array(PostContentSchema).describe(
    'Content for the reply post(s), always an array, even for a single post',
  ),
}).describe('Reply to post request');

export const PostToDeleteSchema = z.object({
  platform: PlatformSchema.describe('Platform of the post to delete'),
  userId: z.string().describe('User ID on the platform'),
  postId: z.string().describe('ID of the post to delete'),
}).describe('Post to delete');

export const DeletePostRequestSchema = z.object({
  targets: z.array(TargetSchema).describe('Array of targets to delete posts'),
  posts: z.array(PostToDeleteSchema).describe('Array of posts to delete'),
}).describe('Delete post request');

export const LikePostRequestSchema = z.object({
  targets: z.array(TargetSchema).describe(
    'Array of targets to like the post (must be on the same platform as the post being liked)',
  ),
  platform: PlatformSchema.describe('Platform of the post being liked'),
  postId: z.string().describe('ID of the post to like'),
}).describe('Like post request');

export const UnlikePostRequestSchema = z.object({
  targets: z.array(TargetSchema).describe(
    'Array of targets to unlike the post (must be on the same platform as the post being unliked)',
  ),
  platform: PlatformSchema.describe('Platform of the post being unliked'),
  postId: z.string().describe('ID of the post to unlike'),
}).describe('Unlike post request');

export const PostResponseSchema = z.union([PostSchema, z.array(PostSchema)]).describe(
  'Post response',
);

export const CreatePostResponseSchema = PostResponseSchema.describe(
  'Create post response',
);

export const RepostResponseSchema = PostResponseSchema.describe('Repost response');

export const QuotePostResponseSchema = PostResponseSchema.describe('Quote post response');

export const ReplyToPostResponseSchema = PostResponseSchema.describe('Reply to post response');

export const DeletePostResponseSchema = z.object({
  id: z.string().describe('ID of the deleted post'),
}).describe('Delete post response');

export const LikePostResponseSchema = z.object({
  id: z.string().describe('ID of the liked post'),
}).describe('Like post response');

export const UnlikePostResponseSchema = z.object({
  id: z.string().describe('ID of the unliked post'),
}).describe('Unlike post response');

export type Media = z.infer<typeof MediaSchema>;
export type MediaContent = z.infer<typeof MediaContentSchema>;
export type PostMetrics = z.infer<typeof PostMetricsSchema>;
export type Post = z.infer<typeof PostSchema>;
export type PostContent = z.infer<typeof PostContentSchema>;
export type PostResult = z.infer<typeof PostResultSchema>;
export type DeleteResult = z.infer<typeof DeleteResultSchema>;
export type LikeResult = z.infer<typeof LikeResultSchema>;
export type Target = z.infer<typeof TargetSchema>;
export type PostToDelete = z.infer<typeof PostToDeleteSchema>;

export type CreatePostRequest = z.infer<typeof CreatePostRequestSchema>;
export type RepostRequest = z.infer<typeof RepostRequestSchema>;
export type QuotePostRequest = z.infer<typeof QuotePostRequestSchema>;
export type ReplyToPostRequest = z.infer<typeof ReplyToPostRequestSchema>;
export type DeletePostRequest = z.infer<typeof DeletePostRequestSchema>;
export type LikePostRequest = z.infer<typeof LikePostRequestSchema>;
export type UnlikePostRequest = z.infer<typeof UnlikePostRequestSchema>;

export type CreatePostResponse = z.infer<typeof CreatePostResponseSchema>;
export type RepostResponse = z.infer<typeof RepostResponseSchema>;
export type QuotePostResponse = z.infer<typeof QuotePostResponseSchema>;
export type ReplyToPostResponse = z.infer<typeof ReplyToPostResponseSchema>;
export type DeletePostResponse = z.infer<typeof DeletePostResponseSchema>;
export type LikePostResponse = z.infer<typeof LikePostResponseSchema>;
export type UnlikePostResponse = z.infer<typeof UnlikePostResponseSchema>;
