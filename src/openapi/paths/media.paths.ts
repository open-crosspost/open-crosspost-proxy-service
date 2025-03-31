/**
 * Media Paths
 * Defines OpenAPI paths for media-related endpoints
 */
export const mediaPaths = {
  '/api/media': {
    post: {
      tags: ['media'],
      summary: 'Upload media',
      description: 'Upload media for use in posts',
      operationId: 'uploadMedia',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/MediaUploadJsonRequest',
            },
          },
          'multipart/form-data': {
            schema: {
              $ref: '#/components/schemas/MediaUploadFormRequest',
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Media uploaded successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/MediaUploadResponse',
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
        '413': {
          description: 'Payload too large',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '415': {
          description: 'Unsupported media type',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '429': {
          description: 'Rate limit exceeded',
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
          nearSignature: [],
        },
      ],
    },
  },
  '/api/media/{id}/status': {
    get: {
      tags: ['media'],
      summary: 'Get media status',
      description: 'Get the status of a media upload',
      operationId: 'getMediaStatus',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'Media ID',
        },
      ],
      responses: {
        '200': {
          description: 'Media status retrieved successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/MediaStatusResponse',
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
        '404': {
          description: 'Media not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '429': {
          description: 'Rate limit exceeded',
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
          nearSignature: [],
        },
      ],
    },
  },
  '/api/media/{id}/metadata': {
    put: {
      tags: ['media'],
      summary: 'Update media metadata',
      description: 'Update metadata for a media upload (e.g., alt text)',
      operationId: 'updateMediaMetadata',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'Media ID',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/MediaMetadataUpdateRequest',
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Media metadata updated successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/MediaMetadataUpdateResponse',
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
        '404': {
          description: 'Media not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse',
              },
            },
          },
        },
        '429': {
          description: 'Rate limit exceeded',
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
          nearSignature: [],
        },
      ],
    },
  },
};
