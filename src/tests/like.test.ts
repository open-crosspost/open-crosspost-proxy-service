import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { LikeService } from '../services/LikeService';
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
  v2: {
    like: jest.fn().mockResolvedValue({ data: { liked: true } }),
    unlike: jest.fn().mockResolvedValue({ data: { liked: false } }),
  },
};

(TwitterApi as jest.MockedClass<typeof TwitterApi>).mockImplementation(() => {
  return mockTwitterApiInstance as unknown as TwitterApi;
});

describe('LikeService', () => {
  let likeService: LikeService;
  let mockRequest: Request;

  beforeEach(() => {
    jest.clearAllMocks();
    
    likeService = new LikeService(mockEnv as any);
    
    // Create a mock request
    mockRequest = {
      url: 'https://api.example.com/api/like/tweet-id-123',
      headers: new Headers(),
    } as unknown as Request;
    
    // Mock URL constructor
    global.URL = jest.fn().mockImplementation(() => ({
      pathname: '/api/like/tweet-id-123',
    })) as any;
  });

  describe('likeTweet', () => {
    it('should like a tweet successfully', async () => {
      const response = await likeService.likeTweet(mockRequest);
      
      // Check that extractUserId was called
      expect(extractUserId).toHaveBeenCalledWith(mockRequest);
      
      // Check that TwitterApi was instantiated with the access token
      expect(TwitterApi).toHaveBeenCalledWith('test-access-token');
      
      // Check that like was called with the correct parameters
      expect(mockTwitterApiInstance.v2.like).toHaveBeenCalledWith(
        'test-user-id',
        'tweet-id-123'
      );
      
      // Check the response
      const responseBody = JSON.parse(await response.text());
      expect(responseBody).toEqual({ data: { liked: true } });
    });

    it('should handle errors when liking a tweet', async () => {
      // Mock the like method to throw an error
      mockTwitterApiInstance.v2.like.mockRejectedValueOnce(new Error('Like failed'));
      
      // Mock console.error to prevent error output during tests
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Call the method and expect it to handle the error
      const response = await likeService.likeTweet(mockRequest);
      
      // Check that the response is an error
      expect(response.status).toBe(502); // Twitter API error status
      
      // Check the error response body
      const responseBody = JSON.parse(await response.text());
      expect(responseBody.error.type).toBe('TWITTER_API');
      expect(responseBody.error.message).toBe('Twitter API error');
    });
  });

  describe('unlikeTweet', () => {
    it('should unlike a tweet successfully', async () => {
      const response = await likeService.unlikeTweet(mockRequest);
      
      // Check that unlike was called with the correct parameters
      expect(mockTwitterApiInstance.v2.unlike).toHaveBeenCalledWith(
        'test-user-id',
        'tweet-id-123'
      );
      
      // Check the response
      const responseBody = JSON.parse(await response.text());
      expect(responseBody).toEqual({ data: { liked: false } });
    });

    it('should handle errors when unliking a tweet', async () => {
      // Mock the unlike method to throw an error
      mockTwitterApiInstance.v2.unlike.mockRejectedValueOnce(new Error('Unlike failed'));
      
      // Mock console.error to prevent error output during tests
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Call the method and expect it to handle the error
      const response = await likeService.unlikeTweet(mockRequest);
      
      // Check that the response is an error
      expect(response.status).toBe(502); // Twitter API error status
      
      // Check the error response body
      const responseBody = JSON.parse(await response.text());
      expect(responseBody.error.type).toBe('TWITTER_API');
      expect(responseBody.error.message).toBe('Twitter API error');
    });
  });
});
