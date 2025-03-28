/**
 * Common Schemas
 * Defines OpenAPI schemas for common structures used across the API
 */
export const commonSchemas = {
  // Response Metadata
  ResponseMeta: {
    type: 'object',
    properties: {
      rateLimit: {
        type: 'object',
        properties: {
          remaining: {
            type: 'number',
            description: 'Number of requests remaining in the current window',
          },
          limit: {
            type: 'number',
            description: 'Total number of requests allowed in the window',
          },
          reset: {
            type: 'number',
            description: 'Timestamp when the rate limit resets (in seconds since epoch)',
          },
        },
      },
      pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'number',
            description: 'Current page number',
          },
          perPage: {
            type: 'number',
            description: 'Number of items per page',
          },
          total: {
            type: 'number',
            description: 'Total number of items',
          },
          totalPages: {
            type: 'number',
            description: 'Total number of pages',
          },
          nextCursor: {
            type: 'string',
            description: 'Next page cursor (if applicable)',
          },
          prevCursor: {
            type: 'string',
            description: 'Previous page cursor (if applicable)',
          },
        },
      },
    },
  },

  // Error Response
  ErrorResponse: {
    type: 'object',
    required: ['error'],
    properties: {
      error: {
        type: 'object',
        required: ['type', 'message'],
        properties: {
          type: {
            type: 'string',
            description: 'Error type',
            enum: [
              'AUTHENTICATION',
              'AUTHORIZATION',
              'VALIDATION',
              'RATE_LIMIT',
              'TWITTER_API',
              'TWITTER_REQUEST',
              'TWITTER_PARTIAL_RESPONSE',
              'INTERNAL',
            ],
          },
          message: {
            type: 'string',
            description: 'Error message',
          },
          code: {
            type: 'string',
            description: 'Error code (if applicable)',
          },
          details: {
            type: 'object',
            description: 'Additional error details',
            additionalProperties: true,
          },
        },
      },
    },
  },

  // Media Object
  Media: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Media ID',
      },
      data: {
        type: 'string',
        description: 'Base64 encoded media data (for upload only)',
      },
      mimeType: {
        type: 'string',
        description: 'Media MIME type',
      },
      altText: {
        type: 'string',
        description: 'Alternative text for accessibility',
      },
    },
  },

  // Post Content
  PostContent: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Post text content',
      },
      media: {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Media',
        },
        description: 'Media attachments',
      },
    },
  },
};
