/**
 * Rate Limit Schemas
 * Defines OpenAPI schemas for rate limit-related requests and responses
 */
export const rateLimitSchemas = {
  // Request Schemas
  RateLimitCheckRequest: {
    type: 'object',
    required: ['rateLimitStatus'],
    properties: {
      rateLimitStatus: {
        $ref: '#/components/schemas/RateLimitStatus',
        description: 'Rate limit status object to check',
      },
      action: {
        type: 'string',
        description: 'Action to check rate limits for (e.g., post, like)',
        example: 'post',
      },
    },
  },

  RateLimitObsoleteRequest: {
    type: 'object',
    required: ['rateLimitStatus'],
    properties: {
      rateLimitStatus: {
        $ref: '#/components/schemas/RateLimitStatus',
        description: 'Rate limit status object to check for obsolescence',
      },
    },
  },

  // Response Schemas
  RateLimitStatus: {
    type: 'object',
    required: ['limit', 'remaining', 'reset', 'endpoint'],
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of requests allowed in the window',
      },
      remaining: {
        type: 'number',
        description: 'Number of requests remaining in the current window',
      },
      reset: {
        type: 'number',
        description: 'Timestamp when the rate limit resets (in seconds since epoch)',
      },
      endpoint: {
        type: 'string',
        description: 'Endpoint path',
      },
    },
  },

  RateLimitStatusResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        $ref: '#/components/schemas/RateLimitStatus',
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },

  AllRateLimitsResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        additionalProperties: {
          $ref: '#/components/schemas/RateLimitStatus',
        },
        description: 'Rate limit statuses for various endpoints',
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },

  RateLimitCheckResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['isRateLimited'],
        properties: {
          isRateLimited: {
            type: 'boolean',
            description: 'Whether the rate limit has been hit',
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },

  RateLimitObsoleteResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['isObsolete'],
        properties: {
          isObsolete: {
            type: 'boolean',
            description: 'Whether the rate limit status is obsolete',
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },
};
