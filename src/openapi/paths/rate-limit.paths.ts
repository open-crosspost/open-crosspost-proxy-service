/**
 * Rate Limit Paths
 * Defines OpenAPI paths for rate limit-related endpoints
 */
export const rateLimitPaths = {
  '/rate-limits/{platform}': {
    get: {
      tags: ['rate-limits'],
      summary: 'Get all rate limits',
      description: 'Get rate limit status for all endpoints for a specific platform',
      operationId: 'getAllRateLimits',
      parameters: [
        {
          name: 'platform',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            enum: ['twitter'],
          },
          description: 'Platform name',
          example: 'twitter',
        },
      ],
      responses: {
        '200': {
          description: 'Rate limit statuses retrieved successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AllRateLimitsResponse',
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '403': {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '500': {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
      security: [
        {
          apiKey: [],
        },
      ],
    },
  },
  '/rate-limits/{platform}/{endpoint}': {
    get: {
      tags: ['rate-limits'],
      summary: 'Get rate limit status',
      description: 'Get rate limit status for a specific endpoint on a specific platform',
      operationId: 'getRateLimitStatus',
      parameters: [
        {
          name: 'platform',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            enum: ['twitter'],
          },
          description: 'Platform name',
          example: 'twitter',
        },
        {
          name: 'endpoint',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'Endpoint path',
          example: '/2/tweets',
        },
        {
          name: 'version',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            enum: ['v1', 'v2'],
            default: 'v2',
          },
          description: 'API version',
        },
      ],
      responses: {
        '200': {
          description: 'Rate limit status retrieved successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RateLimitStatusResponse',
              },
            },
          },
        },
        '400': {
          description: 'Invalid request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '403': {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '500': {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
      security: [
        {
          apiKey: [],
        },
      ],
    },
  },
  '/rate-limits/{platform}/check': {
    post: {
      tags: ['rate-limits'],
      summary: 'Check if rate limited',
      description: 'Check if a rate limit has been hit for a specific platform',
      operationId: 'isRateLimited',
      parameters: [
        {
          name: 'platform',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            enum: ['twitter'],
          },
          description: 'Platform name',
          example: 'twitter',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/RateLimitCheckRequest',
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Rate limit check successful',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RateLimitCheckResponse',
              },
            },
          },
        },
        '400': {
          description: 'Invalid request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '403': {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '500': {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
      security: [
        {
          apiKey: [],
        },
      ],
    },
  },
  '/rate-limits/{platform}/obsolete': {
    post: {
      tags: ['rate-limits'],
      summary: 'Check if rate limit is obsolete',
      description: 'Check if a rate limit status is obsolete (reset time has passed) for a specific platform',
      operationId: 'isRateLimitObsolete',
      parameters: [
        {
          name: 'platform',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            enum: ['twitter'],
          },
          description: 'Platform name',
          example: 'twitter',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/RateLimitObsoleteRequest',
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Rate limit obsolete check successful',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RateLimitObsoleteResponse',
              },
            },
          },
        },
        '400': {
          description: 'Invalid request',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '403': {
          description: 'Forbidden',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '500': {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
      security: [
        {
          apiKey: [],
        },
      ],
    },
  },
};
