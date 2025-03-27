import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { TimelineService } from '../services/TimelineService';
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
    userTimeline: jest.fn().mockResolvedValue({
      data: [{ id: 'tweet-1', text: 'Test tweet 1' }],
      meta: { result_count: 1 },
    }),
    userMentionTimeline: jest.fn().mockResolvedValue({
      data: [{ id: 'mention-1', text: 'Test mention 1' }],
      meta: { result_count: 1 },
    }),
    userLikedTweets: jest.fn().mockResolvedValue({
      data: [{ id: 'like-1', text: 'Test like 1' }],
      meta: { result_count: 1 },
    }),
    singleTweet: jest.fn().mockResolvedValue({
      data: { id: 'tweet-id', text: 'Test tweet' },
    }),
  },
};

(TwitterApi as jest.MockedClass<typeof TwitterApi>).mockImplementation(() => {
  return mockTwitterApiInstance as unknown as TwitterApi;
});

describe('TimelineService', () => {
  let timelineService: TimelineService;
  let mockRequest: Request;

  beforeEach(() => {
    jest.clearAllMocks();
    
    timelineService = new TimelineService(mockEnv as any);
    
    // Create a mock request with URL search params
    const mockSearchParams = {
      get: jest.fn().mockImplementation((param) => {
        if (param === 'count') return '10';
        if (param === 'since_id') return 'since-id-123';
        if (param === 'max_id') return 'max-id-456';
        return null;
      }),
    };
    
    mockRequest = {
      url: 'https://api.example.com/api/timeline?count=10&since_id=since-id-123&max_id=max-id-456',
      headers: new Headers(),
    } as unknown as Request;
    
    // Add search params to the URL
    Object.defineProperty(mockRequest, 'url', {
      get: () => 'https://api.example.com/api/timeline?count=10&since_id=since-id-123&max_id=max-id-456',
    });
    
    // Mock URL constructor
    global.URL = jest.fn().mockImplementation(() => ({
      searchParams: mockSearchParams,
      pathname: '/api/timeline',
    })) as any;
  });

  describe('getUserTimeline', () => {
    it('should get user timeline successfully', async () => {
      const response = await timelineService.getUserTimeline(mockRequest);
      
      // Check that extractUserId was called
      expect(extractUserId).toHaveBeenCalledWith(mockRequest);
      
      // Check that TwitterApi was instantiated with the access token
      expect(TwitterApi).toHaveBeenCalledWith('test-access-token');
      
      // Check that userTimeline was called with the correct parameters
      expect(mockTwitterApiInstance.v2.userTimeline).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          max_results: 10,
          since_id: 'since-id-123',
          until_id: 'max-id-456',
        })
      );
      
      // Check the response
      const responseBody = JSON.parse(await response.text());
      expect(responseBody).toEqual({
        data: [{ id: 'tweet-1', text: 'Test tweet 1' }],
        meta: { result_count: 1 },
      });
    });

    it('should handle errors when getting user timeline', async () => {
      // Mock the userTimeline method to throw an error
      mockTwitterApiInstance.v2.userTimeline.mockRejectedValueOnce(new Error('Timeline failed'));
      
      // Mock console.error to prevent error output during tests
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Call the method and expect it to handle the error
      const response = await timelineService.getUserTimeline(mockRequest);
      
      // Check that the response is an error
      expect(response.status).toBe(502); // Twitter API error status
      
      // Check the error response body
      const responseBody = JSON.parse(await response.text());
      expect(responseBody.error.type).toBe('TWITTER_API');
      expect(responseBody.error.message).toBe('Twitter API error');
    });
  });

  describe('getUserMentions', () => {
    it('should get user mentions successfully', async () => {
      const response = await timelineService.getUserMentions(mockRequest);
      
      // Check that userMentionTimeline was called with the correct parameters
      expect(mockTwitterApiInstance.v2.userMentionTimeline).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          max_results: 10,
          since_id: 'since-id-123',
          until_id: 'max-id-456',
        })
      );
      
      // Check the response
      const responseBody = JSON.parse(await response.text());
      expect(responseBody).toEqual({
        data: [{ id: 'mention-1', text: 'Test mention 1' }],
        meta: { result_count: 1 },
      });
    });
  });

  describe('getUserLikes', () => {
    it('should get user likes successfully', async () => {
      const response = await timelineService.getUserLikes(mockRequest);
      
      // Check that userLikedTweets was called with the correct parameters
      expect(mockTwitterApiInstance.v2.userLikedTweets).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          max_results: 10,
        })
      );
      
      // Check the response
      const responseBody = JSON.parse(await response.text());
      expect(responseBody).toEqual({
        data: [{ id: 'like-1', text: 'Test like 1' }],
        meta: { result_count: 1 },
      });
    });
  });

  describe('getTweet', () => {
    it('should get a single tweet successfully', async () => {
      // Mock the URL to include a tweet ID
      Object.defineProperty(mockRequest, 'url', {
        get: () => 'https://api.example.com/api/tweet/tweet-id',
      });
      
      // Mock URL constructor for this specific test
      global.URL = jest.fn().mockImplementation(() => ({
        searchParams: { get: jest.fn() },
        pathname: '/api/tweet/tweet-id',
      })) as any;
      
      const response = await timelineService.getTweet(mockRequest);
      
      // Check that singleTweet was called with the correct parameters
      expect(mockTwitterApiInstance.v2.singleTweet).toHaveBeenCalledWith(
        'tweet-id',
        expect.any(Object)
      );
      
      // Check the response
      const responseBody = JSON.parse(await response.text());
      expect(responseBody).toEqual({
        data: { id: 'tweet-id', text: 'Test tweet' },
      });
    });
  });
});
