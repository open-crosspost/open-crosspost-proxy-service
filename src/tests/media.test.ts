import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { MediaService } from '../services/MediaService';
import { extractUserId } from '../middleware/auth';
import { TwitterApi } from 'twitter-api-v2';

// Mock dependencies
jest.mock('../middleware/auth', () => ({
  extractUserId: jest.fn().mockReturnValue('test-user-id'),
}));

jest.mock('twitter-api-v2');

// Mock the environment
const mockEnv = {
  TOKENS: {
    put: jest.fn(),
    get: jest.fn().mockResolvedValue(JSON.stringify({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: Date.now() + 3600 * 1000, // 1 hour from now
      scope: 'tweet.read tweet.write',
    })),
    delete: jest.fn(),
  },
  TWITTER_CLIENT_ID: 'test-client-id',
  TWITTER_CLIENT_SECRET: 'test-client-secret',
  TWITTER_API_KEY: 'test-api-key',
  TWITTER_API_SECRET: 'test-api-secret',
  TWITTER_ACCESS_TOKEN: 'test-access-token',
  TWITTER_ACCESS_SECRET: 'test-access-secret',
  ENCRYPTION_KEY: 'dGVzdC1lbmNyeXB0aW9uLWtleQ==', // base64 encoded "test-encryption-key"
  ALLOWED_ORIGINS: 'https://example.com',
  API_KEYS: '{"test-key":["https://example.com"]}',
  ENVIRONMENT: 'test',
  DB: {} as D1Database,
};

// Mock TokenStore
jest.mock('../services/tokenStore', () => {
  return {
    TokenStore: jest.fn().mockImplementation(() => {
      return {
        getTokens: jest.fn().mockResolvedValue({
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
          expiresAt: Date.now() + 3600 * 1000, // 1 hour from now
          scope: 'tweet.read tweet.write',
        }),
        saveTokens: jest.fn(),
        deleteTokens: jest.fn(),
        isTokenValid: jest.fn().mockReturnValue(true),
      };
    }),
  };
});

// Mock TwitterApi
const mockTwitterApiInstance = {
  v1: {
    uploadMedia: jest.fn().mockResolvedValue('test-media-id'),
  },
};

(TwitterApi as jest.MockedClass<typeof TwitterApi>).mockImplementation(() => {
  return mockTwitterApiInstance as unknown as TwitterApi;
});

describe('MediaService', () => {
  let mediaService: MediaService;
  let mockRequest: Request;
  let mockFormData: FormData;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mediaService = new MediaService(mockEnv as any);
    
    // Create a mock FormData
    mockFormData = new FormData();
    mockFormData.append('media', 'test-media-data');
    mockFormData.append('mimeType', 'image/jpeg');
    
    // Create a mock request
    mockRequest = {
      formData: jest.fn().mockResolvedValue(mockFormData),
      url: 'https://api.example.com/api/media/upload',
      headers: new Headers(),
    } as unknown as Request;
  });

  describe('uploadMedia', () => {
    it('should upload media successfully', async () => {
      // Mock Buffer.from
      global.Buffer = {
        from: jest.fn().mockReturnValue(Buffer.alloc(1024)),
      } as any;
      
      const response = await mediaService.uploadMedia(mockRequest);
      
      // Check that extractUserId was called
      expect(extractUserId).toHaveBeenCalledWith(mockRequest);
      
      // Check that TwitterApi was instantiated with the OAuth 1.0a credentials
      expect(TwitterApi).toHaveBeenCalledWith({
        appKey: 'test-api-key',
        appSecret: 'test-api-secret',
        accessToken: 'test-access-token',
        accessSecret: 'test-access-secret',
      });
      
      // Check that uploadMedia was called
      expect(mockTwitterApiInstance.v1.uploadMedia).toHaveBeenCalled();
      
      // Check the response
      const responseBody = JSON.parse(await response.text());
      expect(responseBody).toEqual({ media_id: 'test-media-id' });
    });

    it('should handle errors when uploading media', async () => {
      // Mock Buffer.from
      global.Buffer = {
        from: jest.fn().mockReturnValue(Buffer.alloc(1024)),
      } as any;
      
      // Mock the uploadMedia method to throw an error
      mockTwitterApiInstance.v1.uploadMedia.mockRejectedValueOnce(new Error('Upload failed'));
      
      // Mock console.error to prevent error output during tests
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Call the method and expect it to handle the error
      const response = await mediaService.uploadMedia(mockRequest);
      
      // Check that the response is an error
      expect(response.status).toBe(502); // Twitter API error status
      
      // Check the error response body
      const responseBody = JSON.parse(await response.text());
      expect(responseBody.error.type).toBe('TWITTER_API');
      expect(responseBody.error.message).toBe('Twitter API error');
    });
  });

  describe('getMediaStatus', () => {
    it('should get media status successfully', async () => {
      // Mock the URL to include a media ID
      mockRequest.url = 'https://api.example.com/api/media/status/test-media-id';
      
      const response = await mediaService.getMediaStatus(mockRequest);
      
      // Check the response
      const responseBody = JSON.parse(await response.text());
      expect(responseBody).toHaveProperty('media_id', 'test-media-id');
      expect(responseBody).toHaveProperty('processing_info');
      expect(responseBody.processing_info).toHaveProperty('state', 'succeeded');
    });
  });
});
