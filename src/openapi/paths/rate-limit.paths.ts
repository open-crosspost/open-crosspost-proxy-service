/**
 * Rate Limit Paths
 * Defines OpenAPI paths for rate limit-related endpoints
 */
export const rateLimitPaths = {
  '/rate-limits': {
    get: {
      tags: ['rate-limits'],
      summary: 'Get all rate limits',
      description: 'Get rate limit status for all endpoints',
      operationId: 'getAllRateLimits',
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
  '/rate-limits/{endpoint}': {
    get: {
      tags: ['rate-limits'],
      summary: 'Get rate limit status',
      description: 'Get rate limit status for a specific endpoint',
      operationId: 'getRateLimitStatus',
      parameters: [
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
  '/rate-limits/check': {
    post: {
      tags: ['rate-limits'],
      summary: 'Check if rate limited',
      description: 'Check if a rate limit has been hit',
      operationId: 'isRateLimited',
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
  '/rate-limits/obsolete': {
    post: {
      tags: ['rate-limits'],
      summary: 'Check if rate limit is obsolete',
      description: 'Check if a rate limit status is obsolete (reset time has passed)',
      operationId: 'isRateLimitObsolete',
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
