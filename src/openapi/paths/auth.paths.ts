/**
 * Auth Paths
 * Defines OpenAPI paths for authentication-related endpoints
 */
export const authPaths = {
  '/auth/{platform}/login': {
    post: {
      tags: ['auth'],
      summary: 'Initialize authentication',
      description:
        'Start the OAuth flow by generating an authentication URL for a specific platform',
      operationId: 'initializeAuth',
      parameters: [
        {
          name: 'platform',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            enum: ['twitter'],
          },
          description: 'The social media platform to authenticate with',
        },
      ],
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
  '/auth/{platform}/callback': {
    get: {
      tags: ['auth'],
      summary: 'Handle OAuth callback',
      description:
        'Process the OAuth callback and exchange the code for tokens for a specific platform',
      operationId: 'handleCallback',
      parameters: [
        {
          name: 'platform',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            enum: ['twitter'],
          },
          description: 'The social media platform handling the callback',
        },
        {
          name: 'code',
          in: 'query',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'The authorization code from the OAuth provider',
        },
        {
          name: 'state',
          in: 'query',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'The state parameter for CSRF protection',
        },
      ],
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
  '/auth/{platform}/refresh': {
    post: {
      tags: ['auth'],
      summary: 'Refresh token',
      description: 'Refresh an access token for a specific platform',
      operationId: 'refreshToken',
      parameters: [
        {
          name: 'platform',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            enum: ['twitter'],
          },
          description: 'The social media platform to refresh the token for',
        },
      ],
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
  '/auth/{platform}/revoke': {
    delete: {
      tags: ['auth'],
      summary: 'Revoke token',
      description: "Revoke a user's tokens for a specific platform",
      operationId: 'revokeToken',
      parameters: [
        {
          name: 'platform',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            enum: ['twitter'],
          },
          description: 'The social media platform to revoke the token for',
        },
      ],
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
  '/auth/{platform}/status': {
    get: {
      tags: ['auth'],
      summary: 'Check token status',
      description: 'Check if a user has valid tokens for a specific platform',
      operationId: 'hasValidTokens',
      parameters: [
        {
          name: 'platform',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
            enum: ['twitter'],
          },
          description: 'The social media platform to check token status for',
        },
        {
          name: 'userId',
          in: 'query',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'The user ID on the platform',
        },
      ],
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
  '/auth/accounts': {
    get: {
      tags: ['auth'],
      summary: 'List connected accounts',
      description: 'List all social media accounts connected to a NEAR wallet',
      operationId: 'listConnectedAccounts',
      responses: {
        '200': {
          description: 'Connected accounts retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      accounts: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            platform: {
                              type: 'string',
                              description: 'The social media platform',
                            },
                            userId: {
                              type: 'string',
                              description: 'The user ID on the platform',
                            },
                            username: {
                              type: 'string',
                              description: 'The username on the platform',
                            },
                          },
                        },
                      },
                    },
                  },
                },
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
  '/auth/authorize/near': {
    post: {
      tags: ['auth'],
      summary: 'Authorize NEAR Account',
      description:
        'Authorizes a NEAR account to interact with the proxy by verifying its signature. This must be done before attempting to link any platform accounts.',
      operationId: 'authorizeNear',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/AuthorizeNearRequest',
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'NEAR account authorized successfully.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AuthorizeNearResponse',
              },
            },
          },
        },
        '400': {
          description: 'Invalid request body or signature validation failed.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '500': {
          description: 'Internal server error (e.g., failed to store authorization).',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
      // No specific security applied here as the signature validation is part of the request body/logic
    },
  },
  '/auth/unauthorize/near': {
    delete: {
      tags: ['auth'],
      summary: 'Unauthorize NEAR Account',
      description:
        'Removes the authorization for a NEAR account, preventing it from initiating new platform authentications. Requires signature validation from the account being unauthorized.',
      operationId: 'unauthorizeNear',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              // Uses the same request body schema as authorization
              $ref: '#/components/schemas/AuthorizeNearRequest',
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'NEAR account unauthorized successfully.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UnauthorizeNearResponse',
              },
            },
          },
        },
        '400': {
          description: 'Invalid request body or signature validation failed.',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '500': {
          description: 'Internal server error (e.g., failed to remove authorization).',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
      },
      // No specific security applied here as the signature validation is part of the request body/logic
    },
  },
};
