/**
 * Configuration exports
 */
export * from './env.ts';

// Default configuration values
export const DEFAULT_CONFIG = {
  // Auth configuration
  AUTH: {
    DEFAULT_SCOPES: [
      'tweet.read',
      'tweet.write',
      'users.read',
      'offline.access',
      'like.read',
      'like.write'
    ],
    TOKEN_EXPIRY: 7200, // 2 hours in seconds
    REFRESH_BUFFER: 300, // 5 minutes in seconds
  },
  
  // API configuration
  API: {
    RATE_LIMIT: {
      MAX_REQUESTS: 100,
      WINDOW_MS: 60000, // 1 minute
    },
    CACHE: {
      DEFAULT_TTL: 60, // 1 minute in seconds
      IMMUTABLE_TTL: 86400, // 24 hours in seconds
    },
  },
  
  // Security configuration
  SECURITY: {
    API_KEY: {
      DEFAULT_EXPIRY_DAYS: 365, // 1 year
      ROTATION_GRACE_PERIOD: 86400000, // 24 hours in milliseconds
    },
    CORS: {
      METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      HEADERS: ['Content-Type', 'Authorization', 'X-API-Key', 'X-User-ID'],
      MAX_AGE: 86400, // 24 hours in seconds
    },
  },
  
  // Media configuration
  MEDIA: {
    MAX_SIZE: 20 * 1024 * 1024, // 20MB
    CHUNK_SIZE: 1024 * 1024, // 1MB
    SUPPORTED_TYPES: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
    ],
  },
};
