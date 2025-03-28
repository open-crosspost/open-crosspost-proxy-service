/**
 * Post Schemas
 * Defines OpenAPI schemas for post-related requests and responses
 */
export const postSchemas = {
  // Request Schemas
  RepostRequest: {
    type: 'object',
    required: ['postId'],
    properties: {
      postId: {
        type: 'string',
        description: 'ID of the post to repost',
      },
    },
  },

  QuotePostRequest: {
    type: 'object',
    required: ['postId'],
    properties: {
      postId: {
        type: 'string',
        description: 'ID of the post to quote',
      },
      text: {
        type: 'string',
        description: 'Text content for the quote post',
      },
      media: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Media',
        },
        description: 'Media attachments for the quote post',
      },
    },
  },

  QuotePostThreadItem: {
    type: 'object',
    properties: {
      postId: {
        type: 'string',
        description: 'ID of the post to quote (required for the first item in the thread)',
      },
      text: {
        type: 'string',
        description: 'Text content for the quote post',
      },
      media: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Media',
        },
        description: 'Media attachments for the quote post',
      },
    },
  },

  ReplyToPostRequest: {
    type: 'object',
    required: ['postId'],
    properties: {
      postId: {
        type: 'string',
        description: 'ID of the post to reply to',
      },
      text: {
        type: 'string',
        description: 'Text content for the reply',
      },
      media: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Media',
        },
        description: 'Media attachments for the reply',
      },
    },
  },

  ReplyToPostThreadItem: {
    type: 'object',
    properties: {
      postId: {
        type: 'string',
        description: 'ID of the post to reply to (required for the first item in the thread)',
      },
      text: {
        type: 'string',
        description: 'Text content for the reply',
      },
      media: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Media',
        },
        description: 'Media attachments for the reply',
      },
    },
  },

  // Response Schemas
  Post: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Post ID',
      },
      text: {
        type: 'string',
        description: 'Post text content',
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'Post creation timestamp',
      },
      authorId: {
        type: 'string',
        description: 'ID of the post author',
      },
      media: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Media',
        },
        description: 'Media attachments',
      },
      metrics: {
        type: 'object',
        properties: {
          retweets: {
            type: 'number',
            description: 'Number of retweets',
          },
          quotes: {
            type: 'number',
            description: 'Number of quote tweets',
          },
          likes: {
            type: 'number',
            description: 'Number of likes',
          },
          replies: {
            type: 'number',
            description: 'Number of replies',
          },
        },
      },
      inReplyToId: {
        type: 'string',
        description: 'ID of the post this is a reply to (if applicable)',
      },
      quotedPostId: {
        type: 'string',
        description: 'ID of the post this is quoting (if applicable)',
      },
    },
  },

  PostResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        oneOf: [
          {
            $ref: '#/components/schemas/Post',
          },
          {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Post',
            },
            description: 'Array of posts (for threads)',
          },
        ],
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },

  DeletePostResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['success'],
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the post was successfully deleted',
          },
          id: {
            type: 'string',
            description: 'ID of the deleted post',
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },

  RepostResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        $ref: '#/components/schemas/Post',
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },

  QuotePostResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        oneOf: [
          {
            $ref: '#/components/schemas/Post',
          },
          {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Post',
            },
            description: 'Array of posts (for threads)',
          },
        ],
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },

  ReplyToPostResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        oneOf: [
          {
            $ref: '#/components/schemas/Post',
          },
          {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Post',
            },
            description: 'Array of posts (for threads)',
          },
        ],
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },

  LikePostResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['success'],
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the post was successfully liked',
          },
          id: {
            type: 'string',
            description: 'ID of the liked post',
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },

  UnlikePostResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['success'],
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the post was successfully unliked',
          },
          id: {
            type: 'string',
            description: 'ID of the unliked post',
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },
};
