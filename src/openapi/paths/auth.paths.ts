/**
 * Auth Paths
 * Defines OpenAPI paths for authentication-related endpoints
 */
export const authPaths = {
  '/auth/init': {
    post: {
      tags: ['auth'],
      summary: 'Initialize authentication',
      description: 'Start the OAuth flow by generating an authentication URL',
      operationId: 'initializeAuth',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/InitializeAuthRequest',
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Authentication URL generated successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/InitializeAuthResponse',
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
  '/auth/callback': {
    post: {
      tags: ['auth'],
      summary: 'Handle OAuth callback',
      description: 'Process the OAuth callback and exchange the code for tokens',
      operationId: 'handleCallback',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/AuthCallbackRequest',
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Authentication successful',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AuthCallbackResponse',
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
  '/auth/refresh': {
    post: {
      tags: ['auth'],
      summary: 'Refresh token',
      description: 'Refresh an access token using a refresh token',
      operationId: 'refreshToken',
      responses: {
        '200': {
          description: 'Token refreshed successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RefreshTokenResponse',
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
          userId: [],
        },
      ],
    },
  },
  '/auth/revoke': {
    post: {
      tags: ['auth'],
      summary: 'Revoke token',
      description: 'Revoke a user\'s tokens',
      operationId: 'revokeToken',
      responses: {
        '200': {
          description: 'Token revoked successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RevokeTokenResponse',
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
          userId: [],
        },
      ],
    },
  },
  '/auth/validate': {
    get: {
      tags: ['auth'],
      summary: 'Validate tokens',
      description: 'Check if a user has valid tokens',
      operationId: 'hasValidTokens',
      responses: {
        '200': {
          description: 'Token validation result',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidateTokensResponse',
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
          userId: [],
        },
      ],
    },
  },
};
