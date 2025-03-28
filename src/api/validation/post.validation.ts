import { z } from 'zod';

/**
 * Post Validation Schemas
 * Defines validation schemas for post-related requests
 */

/**
 * Media Schema
 * Validates media objects in post requests
 */
export const MediaSchema = z.object({
  id: z.string().optional(),
  data: z.string().optional(),
  mimeType: z.string().optional(),
  altText: z.string().optional(),
});

/**
 * Post Content Schema
 * Validates the content of a post
 */
export const PostContentSchema = z.object({
  text: z.string().optional().default(''),
  media: z.array(MediaSchema).optional(),
});

/**
 * Create Post Schema
 * Validates the request to create a post
 * Accepts either a string, a PostContent object, or an array of PostContent objects
 */
export const CreatePostSchema = z.union([
  z.string(),
  PostContentSchema,
  z.array(PostContentSchema),
]);

/**
 * Repost Schema
 * Validates the request to repost/retweet
 */
export const RepostSchema = z.object({
  postId: z.string({
    required_error: 'Post ID is required',
  }),
});

/**
 * Quote Post Schema
 * Validates the request to quote a post
 */
export const QuotePostSchema = z.union([
  // Single quote post
  z.object({
    postId: z.string({
      required_error: 'Post ID is required',
    }),
    text: z.string().optional(),
    media: z.array(MediaSchema).optional(),
  }),
  // Thread of quote posts
  z.array(
    z.object({
      postId: z.string().optional(),
      text: z.string().optional(),
      media: z.array(MediaSchema).optional(),
    })
  ).refine(
    (items) => items.length === 0 || !!items[0].postId,
    {
      message: 'Thread must contain at least one tweet with a postId',
      path: ['0.postId'],
    }
  ),
]);

/**
 * Delete Post Schema
 * Validates the request to delete a post
 */
export const DeletePostSchema = z.object({
  id: z.string({
    required_error: 'Post ID is required',
  }),
});

/**
 * Reply to Post Schema
 * Validates the request to reply to a post
 */
export const ReplyToPostSchema = z.union([
  // Single reply
  z.object({
    postId: z.string({
      required_error: 'Post ID is required',
    }),
    text: z.string().optional(),
    media: z.array(MediaSchema).optional(),
  }),
  // Thread of replies
  z.array(
    z.object({
      postId: z.string().optional(),
      text: z.string().optional(),
      media: z.array(MediaSchema).optional(),
    })
  ).refine(
    (items) => items.length === 0 || !!items[0].postId,
    {
      message: 'Thread must contain at least one tweet with a postId',
      path: ['0.postId'],
    }
  ),
]);

/**
 * Like Post Schema
 * Validates the request to like a post
 */
export const LikePostSchema = z.object({
  id: z.string({
    required_error: 'Post ID is required',
  }),
});

/**
 * Unlike Post Schema
 * Validates the request to unlike a post
 */
export const UnlikePostSchema = z.object({
  id: z.string({
    required_error: 'Post ID is required',
  }),
});
