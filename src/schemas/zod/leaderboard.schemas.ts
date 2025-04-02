import { z } from '../../../deps.ts';

/**
 * Leaderboard Schemas
 * Defines Zod schemas for leaderboard-related requests and responses with OpenAPI metadata
 * Also exports TypeScript types derived from Zod schemas for type safety
 */

// Leaderboard query schema
export const LeaderboardQuerySchema = z.object({
  timeframe: z.enum(['day', 'week', 'month', 'all']).optional().openapi({
    description: 'Timeframe for the leaderboard',
    example: 'week'
  }),
  limit: z.number().min(1).max(100).optional().openapi({
    description: 'Maximum number of results to return (1-100)',
    example: 10
  }),
  offset: z.number().min(0).optional().openapi({
    description: 'Offset for pagination',
    example: 0
  })
}).openapi('LeaderboardQuery');

// Account activity entry schema
export const AccountActivityEntrySchema = z.object({
  signerId: z.string().openapi({
    description: 'NEAR account ID',
    example: 'johndoe.near'
  }),
  totalPosts: z.number().openapi({
    description: 'Total number of posts',
    example: 42
  }),
  totalLikes: z.number().openapi({
    description: 'Total number of likes',
    example: 100
  }),
  totalReposts: z.number().openapi({
    description: 'Total number of reposts',
    example: 15
  }),
  totalReplies: z.number().openapi({
    description: 'Total number of replies',
    example: 25
  }),
  totalQuotes: z.number().openapi({
    description: 'Total number of quote posts',
    example: 10
  }),
  totalScore: z.number().openapi({
    description: 'Total activity score',
    example: 192
  }),
  rank: z.number().openapi({
    description: 'Rank on the leaderboard',
    example: 3
  }),
  lastActive: z.string().datetime().openapi({
    description: 'Timestamp of last activity',
    example: '2023-01-01T12:00:00Z'
  })
}).openapi('AccountActivityEntry');

// Leaderboard response schema
export const LeaderboardResponseSchema = z.object({
  timeframe: z.enum(['day', 'week', 'month', 'all']).openapi({
    description: 'Timeframe for the leaderboard',
    example: 'week'
  }),
  entries: z.array(AccountActivityEntrySchema).openapi({
    description: 'Leaderboard entries'
  }),
  total: z.number().openapi({
    description: 'Total number of entries in the leaderboard',
    example: 100
  }),
  limit: z.number().openapi({
    description: 'Maximum number of results returned',
    example: 10
  }),
  offset: z.number().openapi({
    description: 'Offset for pagination',
    example: 0
  }),
  generatedAt: z.string().datetime().openapi({
    description: 'Timestamp when the leaderboard was generated',
    example: '2023-01-01T12:00:00Z'
  })
}).openapi('LeaderboardResponse');

// Account activity params schema
export const AccountActivityParamsSchema = z.object({
  signerId: z.string().openapi({
    description: 'NEAR account ID',
    example: 'johndoe.near'
  })
}).openapi('AccountActivityParams');

// Account activity query schema
export const AccountActivityQuerySchema = z.object({
  timeframe: z.enum(['day', 'week', 'month', 'all']).optional().openapi({
    description: 'Timeframe for the activity',
    example: 'week'
  })
}).openapi('AccountActivityQuery');

// Platform activity schema
export const PlatformActivitySchema = z.object({
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  posts: z.number().openapi({
    description: 'Number of posts on this platform',
    example: 20
  }),
  likes: z.number().openapi({
    description: 'Number of likes on this platform',
    example: 50
  }),
  reposts: z.number().openapi({
    description: 'Number of reposts on this platform',
    example: 10
  }),
  replies: z.number().openapi({
    description: 'Number of replies on this platform',
    example: 15
  }),
  quotes: z.number().openapi({
    description: 'Number of quote posts on this platform',
    example: 5
  }),
  score: z.number().openapi({
    description: 'Activity score on this platform',
    example: 100
  }),
  lastActive: z.string().datetime().openapi({
    description: 'Timestamp of last activity on this platform',
    example: '2023-01-01T12:00:00Z'
  })
}).openapi('PlatformActivity');

// Account activity response schema
export const AccountActivityResponseSchema = z.object({
  signerId: z.string().openapi({
    description: 'NEAR account ID',
    example: 'johndoe.near'
  }),
  timeframe: z.enum(['day', 'week', 'month', 'all']).openapi({
    description: 'Timeframe for the activity',
    example: 'week'
  }),
  totalPosts: z.number().openapi({
    description: 'Total number of posts across all platforms',
    example: 42
  }),
  totalLikes: z.number().openapi({
    description: 'Total number of likes across all platforms',
    example: 100
  }),
  totalReposts: z.number().openapi({
    description: 'Total number of reposts across all platforms',
    example: 15
  }),
  totalReplies: z.number().openapi({
    description: 'Total number of replies across all platforms',
    example: 25
  }),
  totalQuotes: z.number().openapi({
    description: 'Total number of quote posts across all platforms',
    example: 10
  }),
  totalScore: z.number().openapi({
    description: 'Total activity score across all platforms',
    example: 192
  }),
  rank: z.number().openapi({
    description: 'Rank on the leaderboard',
    example: 3
  }),
  lastActive: z.string().datetime().openapi({
    description: 'Timestamp of last activity across all platforms',
    example: '2023-01-01T12:00:00Z'
  }),
  platforms: z.array(PlatformActivitySchema).openapi({
    description: 'Activity breakdown by platform'
  })
}).openapi('AccountActivityResponse');

// Account posts params schema
export const AccountPostsParamsSchema = z.object({
  signerId: z.string().openapi({
    description: 'NEAR account ID',
    example: 'johndoe.near'
  })
}).openapi('AccountPostsParams');

// Account posts query schema
export const AccountPostsQuerySchema = z.object({
  platform: z.string().optional().openapi({
    description: 'Filter by platform (optional)',
    example: 'twitter'
  }),
  limit: z.number().min(1).max(100).optional().openapi({
    description: 'Maximum number of results to return (1-100)',
    example: 10
  }),
  offset: z.number().min(0).optional().openapi({
    description: 'Offset for pagination',
    example: 0
  }),
  type: z.enum(['post', 'repost', 'reply', 'quote', 'like', 'all']).optional().openapi({
    description: 'Filter by post type (optional)',
    example: 'post'
  })
}).openapi('AccountPostsQuery');

// Account post schema
export const AccountPostSchema = z.object({
  id: z.string().openapi({
    description: 'Post ID',
    example: '1234567890'
  }),
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  type: z.enum(['post', 'repost', 'reply', 'quote', 'like']).openapi({
    description: 'Type of post',
    example: 'post'
  }),
  content: z.string().optional().openapi({
    description: 'Post content (if available)',
    example: 'Hello, world!'
  }),
  url: z.string().url().optional().openapi({
    description: 'URL to the post on the platform (if available)',
    example: 'https://twitter.com/user/status/1234567890'
  }),
  createdAt: z.string().datetime().openapi({
    description: 'Timestamp when the post was created',
    example: '2023-01-01T12:00:00Z'
  }),
  metrics: z.object({
    likes: z.number().optional().openapi({
      description: 'Number of likes (if available)',
      example: 42
    }),
    reposts: z.number().optional().openapi({
      description: 'Number of reposts (if available)',
      example: 10
    }),
    replies: z.number().optional().openapi({
      description: 'Number of replies (if available)',
      example: 5
    }),
    quotes: z.number().optional().openapi({
      description: 'Number of quotes (if available)',
      example: 2
    })
  }).optional().openapi({
    description: 'Post metrics (if available)'
  }),
  inReplyToId: z.string().optional().openapi({
    description: 'ID of the post this is a reply to (if applicable)',
    example: '9876543210'
  }),
  quotedPostId: z.string().optional().openapi({
    description: 'ID of the post this is quoting (if applicable)',
    example: '5678901234'
  })
}).openapi('AccountPost');

// Account posts response schema
export const AccountPostsResponseSchema = z.object({
  signerId: z.string().openapi({
    description: 'NEAR account ID',
    example: 'johndoe.near'
  }),
  posts: z.array(AccountPostSchema).openapi({
    description: 'List of posts'
  }),
  total: z.number().openapi({
    description: 'Total number of posts matching the query',
    example: 42
  }),
  limit: z.number().openapi({
    description: 'Maximum number of results returned',
    example: 10
  }),
  offset: z.number().openapi({
    description: 'Offset for pagination',
    example: 0
  }),
  platform: z.string().optional().openapi({
    description: 'Platform filter (if applied)',
    example: 'twitter'
  }),
  type: z.enum(['post', 'repost', 'reply', 'quote', 'like', 'all']).optional().openapi({
    description: 'Post type filter (if applied)',
    example: 'post'
  })
}).openapi('AccountPostsResponse');

// Export TypeScript types derived from Zod schemas
export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;
export type AccountActivityEntry = z.infer<typeof AccountActivityEntrySchema>;
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;
export type AccountActivityParams = z.infer<typeof AccountActivityParamsSchema>;
export type AccountActivityQuery = z.infer<typeof AccountActivityQuerySchema>;
export type PlatformActivity = z.infer<typeof PlatformActivitySchema>;
export type AccountActivityResponse = z.infer<typeof AccountActivityResponseSchema>;
export type AccountPostsParams = z.infer<typeof AccountPostsParamsSchema>;
export type AccountPostsQuery = z.infer<typeof AccountPostsQuerySchema>;
export type AccountPost = z.infer<typeof AccountPostSchema>;
export type AccountPostsResponse = z.infer<typeof AccountPostsResponseSchema>;
