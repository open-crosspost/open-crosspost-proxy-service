/**
 * Media Schemas
 * Defines OpenAPI schemas for media-related requests and responses
 */
export const mediaSchemas = {
  // Request Schemas
  MediaUploadJsonRequest: {
    type: 'object',
    required: ['data', 'mimeType'],
    properties: {
      data: {
        type: 'string',
        format: 'byte',
        description: 'Base64 encoded media data',
      },
      mimeType: {
        type: 'string',
        description: 'Media MIME type',
        example: 'image/jpeg',
      },
      altText: {
        type: 'string',
        description: 'Alternative text for accessibility',
      },
    },
  },
  
  MediaUploadFormRequest: {
    type: 'object',
    required: ['media'],
    properties: {
      media: {
        type: 'string',
        format: 'binary',
        description: 'Media file',
      },
      mimeType: {
        type: 'string',
        description: 'Media MIME type (optional, will be detected from file)',
      },
      altText: {
        type: 'string',
        description: 'Alternative text for accessibility',
      },
    },
  },
  
  MediaMetadataUpdateRequest: {
    type: 'object',
    required: ['altText'],
    properties: {
      altText: {
        type: 'string',
        description: 'Alternative text for accessibility',
      },
    },
  },
  
  // Response Schemas
  MediaUploadResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['mediaId', 'status'],
        properties: {
          mediaId: {
            type: 'string',
            description: 'Media ID',
          },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'succeeded', 'failed'],
            description: 'Media upload status',
          },
          expiresAfter: {
            type: 'number',
            description: 'Timestamp when the media expires (in seconds since epoch)',
          },
          processingInfo: {
            type: 'object',
            properties: {
              state: {
                type: 'string',
                enum: ['pending', 'in_progress', 'completed', 'failed'],
                description: 'Processing state',
              },
              progressPercent: {
                type: 'number',
                description: 'Processing progress percentage',
              },
              error: {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    description: 'Error code',
                  },
                  message: {
                    type: 'string',
                    description: 'Error message',
                  },
                },
              },
            },
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },
  
  MediaStatusResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['mediaId', 'status'],
        properties: {
          mediaId: {
            type: 'string',
            description: 'Media ID',
          },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'succeeded', 'failed'],
            description: 'Media upload status',
          },
          expiresAfter: {
            type: 'number',
            description: 'Timestamp when the media expires (in seconds since epoch)',
          },
          processingInfo: {
            type: 'object',
            properties: {
              state: {
                type: 'string',
                enum: ['pending', 'in_progress', 'completed', 'failed'],
                description: 'Processing state',
              },
              progressPercent: {
                type: 'number',
                description: 'Processing progress percentage',
              },
              error: {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    description: 'Error code',
                  },
                  message: {
                    type: 'string',
                    description: 'Error message',
                  },
                },
              },
            },
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },
  
  MediaMetadataUpdateResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['success'],
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the metadata was successfully updated',
          },
          mediaId: {
            type: 'string',
            description: 'Media ID',
          },
          altText: {
            type: 'string',
            description: 'Updated alternative text',
          },
        },
      },
      meta: {
        $ref: '#/components/schemas/ResponseMeta',
      },
    },
  },
};
