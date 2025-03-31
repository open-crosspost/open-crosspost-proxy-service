import { TimePeriod } from '../../domain/services/activity-tracking.service.ts';

/**
 * Leaderboard Schemas
 * Defines OpenAPI schemas for leaderboard-related requests and responses
 */
export const leaderboardSchemas = {
  // Common Schemas
  LeaderboardEntry: {
    type: 'object',
    required: ['signerId', 'postCount', 'lastPostTimestamp'],
    properties: {
      signerId: {
        type: 'string',
        description: 'NEAR account ID'
      },
      postCount: {
        type: 'number',
        description: 'Number of posts'
      },
      lastPostTimestamp: {
        type: 'number',
        description: 'Timestamp of the last post'
      }
    }
  },

  PlatformLeaderboardEntry: {
    type: 'object',
    required: ['signerId', 'postCount', 'lastPostTimestamp', 'platform'],
    properties: {
      signerId: {
        type: 'string',
        description: 'NEAR account ID'
      },
      postCount: {
        type: 'number',
        description: 'Number of posts'
      },
      lastPostTimestamp: {
        type: 'number',
        description: 'Timestamp of the last post'
      },
      platform: {
        type: 'string',
        description: 'Platform name'
      }
    }
  },

  Pagination: {
    type: 'object',
    required: ['total', 'limit', 'offset'],
    properties: {
      total: {
        type: 'number',
        description: 'Total number of entries'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of entries per page'
      },
      offset: {
        type: 'number',
        description: 'Number of entries to skip'
      }
    }
  },

  PostRecord: {
    type: 'object',
    required: ['postId', 'platform', 'timestamp', 'userId'],
    properties: {
      postId: {
        type: 'string',
        description: 'Post ID'
      },
      platform: {
        type: 'string',
        description: 'Platform name'
      },
      timestamp: {
        type: 'string',
        format: 'date-time',
        description: 'Timestamp of the post'
      },
      userId: {
        type: 'string',
        description: 'User ID on the platform'
      }
    }
  },

  AccountActivity: {
    type: 'object',
    required: ['signerId', 'postCount', 'firstPostTimestamp', 'lastPostTimestamp'],
    properties: {
      signerId: {
        type: 'string',
        description: 'NEAR account ID'
      },
      postCount: {
        type: 'number',
        description: 'Number of posts'
      },
      firstPostTimestamp: {
        type: 'number',
        description: 'Timestamp of the first post'
      },
      lastPostTimestamp: {
        type: 'number',
        description: 'Timestamp of the last post'
      }
    }
  },

  PlatformAccountActivity: {
    type: 'object',
    required: ['signerId', 'postCount', 'firstPostTimestamp', 'lastPostTimestamp', 'platform'],
    properties: {
      signerId: {
        type: 'string',
        description: 'NEAR account ID'
      },
      postCount: {
        type: 'number',
        description: 'Number of posts'
      },
      firstPostTimestamp: {
        type: 'number',
        description: 'Timestamp of the first post'
      },
      lastPostTimestamp: {
        type: 'number',
        description: 'Timestamp of the last post'
      },
      platform: {
        type: 'string',
        description: 'Platform name'
      }
    }
  },

  // Response Schemas
  LeaderboardResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['entries', 'pagination', 'timeframe'],
        properties: {
          entries: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/LeaderboardEntry'
            },
            description: 'Leaderboard entries'
          },
          pagination: {
            $ref: '#/components/schemas/Pagination',
            description: 'Pagination information'
          },
          timeframe: {
            type: 'string',
            enum: Object.values(TimePeriod),
            description: 'Time period for filtering'
          },
          platform: {
            type: 'string',
            description: 'Platform name for filtering (if specified)'
          }
        }
      }
    }
  },

  AccountActivityResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        oneOf: [
          { $ref: '#/components/schemas/AccountActivity' },
          { $ref: '#/components/schemas/PlatformAccountActivity' }
        ],
        description: 'Account activity data'
      }
    }
  },

  AccountPostsResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['posts', 'pagination'],
        properties: {
          posts: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/PostRecord'
            },
            description: 'Post records'
          },
          pagination: {
            type: 'object',
            required: ['limit', 'offset'],
            properties: {
              limit: {
                type: 'number',
                description: 'Maximum number of posts per page'
              },
              offset: {
                type: 'number',
                description: 'Number of posts to skip'
              }
            },
            description: 'Pagination information'
          },
          platform: {
            type: 'string',
            description: 'Platform name for filtering (if specified)'
          }
        }
      }
    }
  },

  LeaderboardErrorResponse: {
    type: 'object',
    required: ['error'],
    properties: {
      error: {
        type: 'object',
        required: ['type', 'message', 'status'],
        properties: {
          type: {
            type: 'string',
            description: 'Error type'
          },
          message: {
            type: 'string',
            description: 'Error message'
          },
          status: {
            type: 'number',
            description: 'HTTP status code'
          }
        }
      }
    }
  }
};
