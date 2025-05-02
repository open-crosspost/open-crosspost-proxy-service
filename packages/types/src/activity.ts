import { z } from 'zod';
import { Platform, PlatformSchema } from './common.ts';

export enum ActivityType {
  POST = 'post',
  REPOST = 'repost',
  REPLY = 'reply',
  QUOTE = 'quote',
  LIKE = 'like',
  UNLIKE = 'unlike',
  DELETE = 'delete',
}

export enum TimePeriod {
  ALL = 'all',
  YEARLY = 'year',
  MONTHLY = 'month',
  WEEKLY = 'week',
  DAILY = 'day',
}

/**
 * Schema for filtering by platform, activity type, and timeframe
 * Handles comma-separated lists for platforms and types
 */
export const FilterSchema = z.object({
  platforms: z.string().optional()
    .transform((val) => {
      if (!val) return undefined;
      return val.split(',')
        .map((p) => p.trim())
        .map((p) => {
          try {
            return Platform[p.toUpperCase() as keyof typeof Platform];
          } catch (_e) {
            return p;
          }
        });
    })
    .pipe(
      z.array(z.nativeEnum(Platform)).optional(),
    )
    .describe('Filter by platforms (comma-separated list, optional)'),
  types: z.string().optional()
    .transform((val) => {
      if (!val) return undefined;
      return val.split(',')
        .map((t) => t.trim())
        .map((t) => {
          try {
            return ActivityType[t.toUpperCase() as keyof typeof ActivityType];
          } catch (_e) {
            return t;
          }
        });
    })
    .pipe(
      z.array(z.nativeEnum(ActivityType)).optional(),
    )
    .describe('Filter by activity types (comma-separated list, optional)'),
  timeframe: z.nativeEnum(TimePeriod).optional().transform((val) => {
    if (!val) return TimePeriod.ALL;
    return val;
  }).describe(
    'Timeframe for filtering (optional)',
  ),
}).describe('Filter parameters');

/**
 * Common pagination schema used across queries
 */
export const PaginationSchema = z.object({
  limit: z.string().optional()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .pipe(z.number().min(1).max(100).optional())
    .describe('Maximum number of results to return (1-100)'),
  offset: z.string().optional()
    .transform((val) => val ? parseInt(val, 10) : undefined)
    .pipe(z.number().min(0).optional())
    .describe('Offset for pagination'),
}).describe('Pagination parameters');

/**
 * Query schema for leaderboard endpoints
 */
export const ActivityLeaderboardQuerySchema = z.object({
  filter: FilterSchema.optional(),
}).describe('Account leaderboard query').merge(PaginationSchema);

export const AccountActivityEntrySchema = z.object({
  signerId: z.string().describe('NEAR account ID'),
  totalPosts: z.number().describe('Total number of posts'),
  totalLikes: z.number().describe('Total number of likes'),
  totalReposts: z.number().describe('Total number of reposts'),
  totalReplies: z.number().describe('Total number of replies'),
  totalQuotes: z.number().describe('Total number of quote posts'),
  totalScore: z.number().describe('Total activity score'),
  rank: z.number().describe('Rank on the leaderboard'),
  lastActive: z.string().datetime().describe('Timestamp of last activity'),
  firstPostTimestamp: z.string().datetime().describe('Timestamp of the first post'),
}).describe('Account activity entry');

const ActivityLeaderboardResponseSchema = z.object({
  timeframe: z.nativeEnum(TimePeriod).describe('Timeframe for the leaderboard'),
  entries: z.array(AccountActivityEntrySchema).describe('Leaderboard entries'),
  generatedAt: z.string().datetime().describe('Timestamp when the leaderboard was generated'),
  platforms: z.array(PlatformSchema).optional().describe('Platform filters (if applied)'),
});

export const AccountActivityParamsSchema = z.object({
  signerId: z.string().describe('NEAR account ID'),
}).describe('Account activity params');

/**
 * Query schema for account activity endpoints
 */
export const AccountActivityQuerySchema = z.object({
  filter: FilterSchema.optional(),
}).describe('Account activity query').merge(PaginationSchema);

export const PlatformActivitySchema = z.object({
  platform: PlatformSchema,
  posts: z.number().describe('Number of posts on this platform'),
  likes: z.number().describe('Number of likes on this platform'),
  reposts: z.number().describe('Number of reposts on this platform'),
  replies: z.number().describe('Number of replies on this platform'),
  quotes: z.number().describe('Number of quote posts on this platform'),
  score: z.number().describe('Activity score on this platform'),
  lastActive: z.string().datetime().describe('Timestamp of last activity on this platform'),
}).describe('Platform activity');

const AccountActivityResponseSchema = z.object({
  signerId: z.string().describe('NEAR account ID'),
  timeframe: z.nativeEnum(TimePeriod).describe('Timeframe for the activity'),
  totalPosts: z.number().describe('Total number of posts across all platforms'),
  totalLikes: z.number().describe('Total number of likes across all platforms'),
  totalReposts: z.number().describe('Total number of reposts across all platforms'),
  totalReplies: z.number().describe('Total number of replies across all platforms'),
  totalQuotes: z.number().describe('Total number of quote posts across all platforms'),
  totalScore: z.number().describe('Total activity score across all platforms'),
  rank: z.number().describe('Rank on the leaderboard'),
  lastActive: z.string().datetime().describe('Timestamp of last activity across all platforms'),
  platforms: z.array(PlatformActivitySchema).describe('Activity breakdown by platform'),
});

export const AccountPostsParamsSchema = z.object({
  signerId: z.string().describe('NEAR account ID'),
}).describe('Account posts params');

/**
 * Query schema for account posts endpoints
 */
export const AccountPostsQuerySchema = z.object({
  filter: FilterSchema.optional(),
}).describe('Account posts query').merge(PaginationSchema);

export const AccountPostSchema = z.object({
  id: z.string().describe('Post ID'),
  platform: PlatformSchema,
  userId: z.string().describe('User ID on the platform'),
  type: z.nativeEnum(ActivityType).describe('Type of post'),
  content: z.string().optional().describe('Post content (if available)'),
  url: z.string().url().optional().describe('URL to the post on the platform (if available)'),
  createdAt: z.string().datetime().describe('Timestamp when the post was created'),
  metrics: z.object({
    likes: z.number().optional().describe('Number of likes (if available)'),
    reposts: z.number().optional().describe('Number of reposts (if available)'),
    replies: z.number().optional().describe('Number of replies (if available)'),
    quotes: z.number().optional().describe('Number of quotes (if available)'),
  }).optional().describe('Post metrics (if available)'),
  inReplyToId: z.string().optional().describe('ID of the post this is a reply to (if applicable)'),
  quotedPostId: z.string().optional().describe('ID of the post this is quoting (if applicable)'),
}).describe('Account post');

const AccountPostsResponseSchema = z.object({
  signerId: z.string().describe('NEAR account ID'),
  posts: z.array(AccountPostSchema).describe('List of posts'),
  platforms: z.array(z.string()).optional().describe('Platform filters (if applied)'),
  types: z.array(z.string()).optional().describe('Post type filters (if applied)'),
});

/**
 * Interface for account activity Response
 */
export interface AccountActivity {
  signerId: string;
  postCount: number;
  firstPostTimestamp: number;
  lastPostTimestamp: number;
}

/**
 * Interface for platform-specific account activity Response
 */
export interface PlatformAccountActivity extends AccountActivity {
  platform: string;
}

/**
 * Interface for post record Response (storage optimized)
 */
export interface PostRecord {
  id: string; // postId
  p: string; // platform
  t: number; // timestamp
  u: string; // userId
  ty: string; // activity type ('post', 'like', 'repost', etc.)
}

export type ActivityLeaderboardQuery = z.infer<typeof ActivityLeaderboardQuerySchema>;
export type AccountActivityEntry = z.infer<typeof AccountActivityEntrySchema>;
export type ActivityLeaderboardResponse = z.infer<typeof ActivityLeaderboardResponseSchema>;
export type AccountActivityParams = z.infer<typeof AccountActivityParamsSchema>;
export type AccountActivityQuery = z.infer<typeof AccountActivityQuerySchema>;
export type PlatformActivity = z.infer<typeof PlatformActivitySchema>;
export type AccountActivityResponse = z.infer<typeof AccountActivityResponseSchema>;
export type AccountPostsParams = z.infer<typeof AccountPostsParamsSchema>;
export type AccountPostsQuery = z.infer<typeof AccountPostsQuerySchema>;
export type AccountPost = z.infer<typeof AccountPostSchema>;
export type AccountPostsResponse = z.infer<typeof AccountPostsResponseSchema>;
export type Filter = z.infer<typeof FilterSchema>;
