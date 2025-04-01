import { TimePeriod } from '../../domain/services/activity-tracking.service.ts';

/**
 * Leaderboard Paths
 * Defines OpenAPI paths for leaderboard-related endpoints
 */
export const leaderboardPaths = {
  '/api/leaderboard': {
    get: {
      summary: 'Get NEAR account posting leaderboard',
      description: 'Returns a leaderboard of NEAR accounts ranked by post count',
      tags: ['Leaderboard'],
      security: [
        {
          nearSignature: [],
        },
      ],
      parameters: [
        {
          name: 'limit',
          in: 'query',
          description: 'Maximum number of entries to return',
          schema: {
            type: 'integer',
            default: 10,
            minimum: 1,
            maximum: 100,
          },
        },
        {
          name: 'offset',
          in: 'query',
          description: 'Number of entries to skip',
          schema: {
            type: 'integer',
            default: 0,
            minimum: 0,
          },
        },
        {
          name: 'timeframe',
          in: 'query',
          description: 'Time period for filtering',
          schema: {
            type: 'string',
            enum: Object.values(TimePeriod),
            default: TimePeriod.ALL_TIME,
          },
        },
        {
          name: 'platform',
          in: 'query',
          description: 'Platform name for filtering',
          schema: {
            type: 'string',
          },
        },
      ],
      responses: {
        '200': {
          description: 'Leaderboard data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LeaderboardResponse',
              },
            },
          },
        },
        '500': {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LeaderboardErrorResponse',
              },
            },
          },
        },
      },
    },
  },
  '/api/activity/{signerId}': {
    get: {
      summary: 'Get account activity',
      description: 'Returns activity data for a specific NEAR account',
      tags: ['Leaderboard'],
      security: [
        {
          nearSignature: [],
        },
      ],
      parameters: [
        {
          name: 'signerId',
          in: 'path',
          required: true,
          description: 'NEAR account ID',
          schema: {
            type: 'string',
          },
        },
        {
          name: 'platform',
          in: 'query',
          description: 'Platform name for filtering',
          schema: {
            type: 'string',
          },
        },
      ],
      responses: {
        '200': {
          description: 'Account activity data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AccountActivityResponse',
              },
            },
          },
        },
        '404': {
          description: 'Account activity not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LeaderboardErrorResponse',
              },
            },
          },
        },
        '500': {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LeaderboardErrorResponse',
              },
            },
          },
        },
      },
    },
  },
  '/api/activity/{signerId}/posts': {
    get: {
      summary: 'Get account posts',
      description: 'Returns post records for a specific NEAR account',
      tags: ['Leaderboard'],
      security: [
        {
          nearSignature: [],
        },
      ],
      parameters: [
        {
          name: 'signerId',
          in: 'path',
          required: true,
          description: 'NEAR account ID',
          schema: {
            type: 'string',
          },
        },
        {
          name: 'platform',
          in: 'query',
          description: 'Platform name for filtering',
          schema: {
            type: 'string',
          },
        },
        {
          name: 'limit',
          in: 'query',
          description: 'Maximum number of posts to return',
          schema: {
            type: 'integer',
            default: 10,
            minimum: 1,
            maximum: 100,
          },
        },
        {
          name: 'offset',
          in: 'query',
          description: 'Number of posts to skip',
          schema: {
            type: 'integer',
            default: 0,
            minimum: 0,
          },
        },
      ],
      responses: {
        '200': {
          description: 'Account posts data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AccountPostsResponse',
              },
            },
          },
        },
        '500': {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LeaderboardErrorResponse',
              },
            },
          },
        },
      },
    },
  },
};
