import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { TweetService } from '../services/TweetService';
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
    tweet: jest.fn().mockResolvedValue({ data: { id: 'test-tweet-id' } }),
    retweet: jest.fn().mockResolvedValue({ data: { retweeted: true } }),
    deleteTweet: jest.fn().mockResolvedValue({ data: { deleted: true } }),
  },
};

(TwitterApi as jest.MockedClass<typeof TwitterApi>).mockImplementation(() => {
  return mockTwitterApiInstance as unknown as TwitterApi;
});

describe('TweetService', () => {
  let tweetService: TweetService;
  let mockRequest: Request;

  beforeEach(() => {
    jest.clearAllMocks();
    
    tweetService = new TweetService(mockEnv as any);
    
    // Create a mock request
    mockRequest = {
      json: jest.fn().mockResolvedValue({ text: 'Test tweet', media: [] }),
      url: 'https://api.example.com/api/tweet',
      headers: new Headers(),
    } as unknown as Request;
  });

  describe('tweet', () => {
    it('should post a tweet successfully', async () => {
      const response = await tweetService.tweet(mockRequest);
      
      // Check that extractUserId was called
      expect(extractUserId).toHaveBeenCalledWith(mockRequest);
      
      // Check that TwitterApi was instantiated with the access token
      expect(TwitterApi).toHaveBeenCalledWith('test-access-token');
      
      // Check that tweet was called with the correct parameters
      expect(mockTwitterApiInstance.v2.tweet).toHaveBeenCalledWith({
        text: 'Test tweet',
      });
      
      // Check the response
      const responseBody = JSON.parse(await response.text());
      expect(responseBody).toEqual({ data: { id: 'test-tweet-id' } });
    });

    it('should handle tweet with media', async () => {
      // Mock the request to include media
      (mockRequest.json as jest.Mock).mockResolvedValueOnce({
        text: 'Test tweet with media',
        media: ['media-id-1', 'media-id-2'],
      });
      
      const response = await tweetService.tweet(mockRequest);
      
      // Check that tweet was called with the correct parameters including media
      expect(mockTwitterApiInstance.v2.tweet).toHaveBeenCalledWith({
        text: 'Test tweet with media',
        media: { media_ids: ['media-id-1', 'media-id-2'] },
      });
      
      // Check the response
      const responseBody = JSON.parse(await response.text());
      expect(responseBody).toEqual({ data: { id: 'test-tweet-id' } });
    });

    it('should handle errors when posting a tweet', async () => {
      // Mock the tweet method to throw an error
      mockTwitterApiInstance.v2.tweet.mockRejectedValueOnce(new Error('Tweet failed'));
      
      // Mock console.error to prevent error output during tests
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Call the method and expect it to handle the error
      const response = await tweetService.tweet(mockRequest);
      
      // Check that the response is an error
      expect(response.status).toBe(502); // Twitter API error status
      
      // Check the error response body
      const responseBody = JSON.parse(await response.text());
      expect(responseBody.error.type).toBe('TWITTER_API');
      expect(responseBody.error.message).toBe('Twitter API error');
    });
  });

  describe('retweet', () => {
    it('should retweet successfully', async () => {
      // Mock the request for a retweet
      (mockRequest.json as jest.Mock).mockResolvedValueOnce({
        tweetId: 'original-tweet-id',
      });
      
      const response = await tweetService.retweet(mockRequest);
      
      // Check that retweet was called with the correct parameters
      expect(mockTwitterApiInstance.v2.retweet).toHaveBeenCalledWith(
        'test-user-id',
        'original-tweet-id'
      );
      
      // Check the response
      const responseBody = JSON.parse(await response.text());
      expect(responseBody).toEqual({ data: { retweeted: true } });
    });
  });

  describe('deleteTweet', () => {
    it('should delete a tweet successfully', async () => {
      // Mock the URL to include a tweet ID
      mockRequest.url = 'https://api.example.com/api/tweet/tweet-to-delete';
      
      const response = await tweetService.deleteTweet(mockRequest);
      
      // Check that deleteTweet was called with the correct parameters
      expect(mockTwitterApiInstance.v2.deleteTweet).toHaveBeenCalledWith('tweet-to-delete');
      
      // Check the response
      const responseBody = JSON.parse(await response.text());
      expect(responseBody).toEqual({ data: { deleted: true } });
    });
  });
});
