import { z } from '../../../deps.ts';

/**
 * Post Schemas
 * Defines Zod schemas for post-related requests and responses with OpenAPI metadata
 */

// Media schema
export const MediaSchema = z.object({
  id: z.string().openapi({
    description: 'Media ID',
    example: '1234567890'
  }),
  type: z.enum(['image', 'video', 'gif']).openapi({
    description: 'Media type',
    example: 'image'
  }),
  url: z.string().optional().openapi({
    description: 'Media URL',
    example: 'https://example.com/image.jpg'
  }),
  altText: z.string().optional().openapi({
    description: 'Alternative text for accessibility',
    example: 'A beautiful sunset over the mountains'
  })
}).openapi('Media');

// Post metrics schema
export const PostMetricsSchema = z.object({
  retweets: z.number().openapi({
    description: 'Number of retweets',
    example: 42
  }),
  quotes: z.number().openapi({
    description: 'Number of quote tweets',
    example: 10
  }),
  likes: z.number().openapi({
    description: 'Number of likes',
    example: 100
  }),
  replies: z.number().openapi({
    description: 'Number of replies',
    example: 5
  })
}).openapi('PostMetrics');

// Post schema
export const PostSchema = z.object({
  id: z.string().openapi({
    description: 'Post ID',
    example: '1234567890'
  }),
  text: z.string().openapi({
    description: 'Post text content',
    example: 'Hello, world!'
  }),
  createdAt: z.string().datetime().openapi({
    description: 'Post creation timestamp',
    example: '2023-01-01T12:00:00Z'
  }),
  authorId: z.string().openapi({
    description: 'ID of the post author',
    example: 'user123'
  }),
  media: z.array(MediaSchema).optional().openapi({
    description: 'Media attachments',
    example: [{ id: '1234567890', type: 'image' }]
  }),
  metrics: PostMetricsSchema.optional().openapi({
    description: 'Post metrics'
  }),
  inReplyToId: z.string().optional().openapi({
    description: 'ID of the post this is a reply to (if applicable)',
    example: '9876543210'
  }),
  quotedPostId: z.string().optional().openapi({
    description: 'ID of the post this is quoting (if applicable)',
    example: '5678901234'
  })
}).openapi('Post');

// Request schemas
export const RepostRequestSchema = z.object({
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  userId: z.string().openapi({
    description: 'User ID on the platform',
    example: 'user123'
  }),
  postId: z.string().openapi({
    description: 'ID of the post to repost',
    example: '1234567890'
  })
}).openapi('RepostRequest');

export const QuotePostRequestSchema = z.object({
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  userId: z.string().openapi({
    description: 'User ID on the platform',
    example: 'user123'
  }),
  postId: z.string().openapi({
    description: 'ID of the post to quote',
    example: '1234567890'
  }),
  content: z.object({
    text: z.string().openapi({
      description: 'Text content for the quote post',
      example: 'Check out this post!'
    }),
    media: z.array(z.object({
      id: z.string().openapi({
        description: 'Media ID',
        example: '1234567890'
      })
    })).optional().openapi({
      description: 'Media attachments for the quote post'
    })
  }).openapi({
    description: 'Content for the quote post'
  })
}).openapi('QuotePostRequest');

export const ReplyToPostRequestSchema = z.object({
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  userId: z.string().openapi({
    description: 'User ID on the platform',
    example: 'user123'
  }),
  postId: z.string().openapi({
    description: 'ID of the post to reply to',
    example: '1234567890'
  }),
  content: z.object({
    text: z.string().openapi({
      description: 'Text content for the reply',
      example: 'Great post!'
    }),
    media: z.array(z.object({
      id: z.string().openapi({
        description: 'Media ID',
        example: '1234567890'
      })
    })).optional().openapi({
      description: 'Media attachments for the reply'
    })
  }).openapi({
    description: 'Content for the reply'
  })
}).openapi('ReplyToPostRequest');

export const DeletePostRequestSchema = z.object({
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  userId: z.string().openapi({
    description: 'User ID on the platform',
    example: 'user123'
  }),
  postId: z.string().openapi({
    description: 'ID of the post to delete',
    example: '1234567890'
  })
}).openapi('DeletePostRequest');

export const LikePostRequestSchema = z.object({
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  userId: z.string().openapi({
    description: 'User ID on the platform',
    example: 'user123'
  }),
  postId: z.string().openapi({
    description: 'ID of the post to like',
    example: '1234567890'
  })
}).openapi('LikePostRequest');

export const UnlikePostRequestSchema = z.object({
  platform: z.string().openapi({
    description: 'Social media platform',
    example: 'twitter'
  }),
  userId: z.string().openapi({
    description: 'User ID on the platform',
    example: 'user123'
  }),
  postId: z.string().openapi({
    description: 'ID of the post to unlike',
    example: '1234567890'
  })
}).openapi('UnlikePostRequest');

// Response schemas
export const ResponseMetaSchema = z.object({
  requestId: z.string().openapi({
    description: 'Unique request identifier',
    example: 'req-123456'
  }),
  timestamp: z.string().datetime().openapi({
    description: 'Response timestamp',
    example: '2023-01-01T12:00:00Z'
  })
}).openapi('ResponseMeta');

export const PostResponseSchema = z.object({
  data: z.union([
    PostSchema,
    z.array(PostSchema)
  ]).openapi({
    description: 'Post data or array of posts (for threads)'
  }),
  meta: ResponseMetaSchema.openapi({
    description: 'Response metadata'
  })
}).openapi('PostResponse');

export const DeletePostResponseSchema = z.object({
  data: z.object({
    success: z.boolean().openapi({
      description: 'Whether the post was successfully deleted',
      example: true
    }),
    id: z.string().openapi({
      description: 'ID of the deleted post',
      example: '1234567890'
    })
  }).openapi({
    description: 'Delete post result'
  }),
  meta: ResponseMetaSchema.openapi({
    description: 'Response metadata'
  })
}).openapi('DeletePostResponse');

export const LikePostResponseSchema = z.object({
  data: z.object({
    success: z.boolean().openapi({
      description: 'Whether the post was successfully liked',
      example: true
    }),
    id: z.string().openapi({
      description: 'ID of the liked post',
      example: '1234567890'
    })
  }).openapi({
    description: 'Like post result'
  }),
  meta: ResponseMetaSchema.openapi({
    description: 'Response metadata'
  })
}).openapi('LikePostResponse');

export const UnlikePostResponseSchema = z.object({
  data: z.object({
    success: z.boolean().openapi({
      description: 'Whether the post was successfully unliked',
      example: true
    }),
    id: z.string().openapi({
      description: 'ID of the unliked post',
      example: '1234567890'
    })
  }).openapi({
    description: 'Unlike post result'
  }),
  meta: ResponseMetaSchema.openapi({
    description: 'Response metadata'
  })
}).openapi('UnlikePostResponse');
