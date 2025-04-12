import { ApiError, ApiErrorCode, Platform, PlatformError } from '@crosspost/types';
import { assertEquals, assertExists } from 'jsr:@std/assert';
import { afterEach, beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { RateLimitController } from '../../../src/controllers/rate-limit.controller.ts';
import { UsageRateLimitMiddleware } from '../../../src/middleware/usage-rate-limit.middleware.ts';
import { MockKvStore } from '../../mocks/kv-store-mock.ts';
import { MockRateLimitService } from '../../mocks/rate-limit-service-mock.ts';
import { createMockContext } from '../../utils/test-utils.ts';

describe('Rate Limit Controller', () => {
  let controller: RateLimitController;
  let mockRateLimitService: MockRateLimitService;
  let mockKvStore: MockKvStore;

  beforeEach(() => {
    // Create mock RateLimitService
    mockRateLimitService = new MockRateLimitService();

    // Create mock KvStore
    mockKvStore = new MockKvStore(['usage_rate_limit']);

    // Create the controller with the mock service and KvStore
    controller = new RateLimitController(mockRateLimitService, mockKvStore);

    // Initialize UsageRateLimitMiddleware with test configuration
    UsageRateLimitMiddleware.initialize({
      maxPostsPerDay: 10,
    });
  });

  afterEach(async () => {
    // Close the mock KvStore
    await mockKvStore.close();
  });

  // Test cases for getRateLimitStatus
  it('should get rate limit status successfully', async () => {
    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
      params: {
        platform: Platform.TWITTER,
        endpoint: 'test-endpoint',
      },
    });

    // Call the controller
    const response = await controller.getRateLimitStatus(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertEquals(responseBody.data.endpoint, 'test-endpoint');
    assertEquals(responseBody.data.limit, 100);
    assertEquals(responseBody.data.remaining, 95);
  });

  // Test cases for getAllRateLimits
  it('should get all rate limits successfully', async () => {
    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
      params: {
        platform: Platform.TWITTER,
      },
    });

    // Call the controller
    const response = await controller.getAllRateLimits(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);

    const endpoints = Object.keys(responseBody.data);
    assertEquals(endpoints.length, 3); // app, endpoint1, endpoint2
    assertExists(responseBody.data.app);
    assertExists(responseBody.data.endpoint1);
    assertExists(responseBody.data.endpoint2);
    assertEquals(responseBody.data.app.limit, 1000);
    assertEquals(responseBody.data.endpoint1.endpoint, 'endpoint1');
    assertEquals(responseBody.data.endpoint2.endpoint, 'endpoint2');
  });

  // Test cases for getUsageRateLimit
  it('should get usage rate limit successfully', async () => {
    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
      params: {
        endpoint: 'post',
      },
    });

    // Call the controller
    const response = await controller.getUsageRateLimit(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertEquals(responseBody.data.signerId, 'test.near');
    assertEquals(responseBody.data.endpoint, 'post');
    assertEquals(responseBody.data.limit, 10);
    assertEquals(responseBody.data.remaining, 10);
  });

  it('should handle existing usage rate limit record', async () => {
    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
      params: {
        endpoint: 'post',
      },
    });

    // Create a mock KV store with existing data
    const customKvStore = new MockKvStore(['usage_rate_limit']);
    customKvStore.get = async <T>(key: string[]): Promise<T | null> => {
      if (key[0] === 'test.near' && key[1] === 'post') {
        return {
          signerId: 'test.near',
          endpoint: 'post',
          count: 5,
          resetTimestamp: Date.now() + 86400000, // Tomorrow
        } as unknown as T;
      }
      return null;
    };

    const testController = new RateLimitController(mockRateLimitService, customKvStore);

    const response = await testController.getUsageRateLimit(context);
    const responseBody = await response.json();

    // Verify the response
    assertEquals(response.status, 200);
    assertExists(responseBody.data);
    assertEquals(responseBody.data.signerId, 'test.near');
    assertEquals(responseBody.data.endpoint, 'post');
    assertEquals(responseBody.data.limit, 10);
    assertEquals(responseBody.data.remaining, 5); // 10 - 5 = 5

    // Clean up
    await customKvStore.close();
  });

  it('should handle internal errors gracefully', async () => {
    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
      params: {
        platform: Platform.TWITTER,
        endpoint: 'test-endpoint',
      },
    });

    // Override the getRateLimitStatus method to throw an error
    mockRateLimitService.getRateLimitStatus = () => {
      throw new ApiError(
        'Test error',
        ApiErrorCode.INTERNAL_ERROR,
        500,
        {},
        false,
      );
    };

    // Create a new controller with the mock service
    const errorController = new RateLimitController(mockRateLimitService);

    // Call the controller
    const response = await errorController.getRateLimitStatus(context);

    // Verify the response
    assertEquals(response.status, 500);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].errorCode, 'INTERNAL_ERROR');
    assertEquals(responseBody.errors[0].error, 'Test error');
  });

  it('should handle platform unavailable errors', async () => {
    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
      params: {
        platform: Platform.TWITTER,
      },
    });

    // Override the getAllRateLimits method to throw a platform unavailable error
    mockRateLimitService.getAllRateLimits = () => {
      throw new PlatformError(
        'Platform unavailable',
        Platform.TWITTER,
        ApiErrorCode.PLATFORM_UNAVAILABLE,
        false,
        undefined,
        503,
      );
    };

    // Create a new controller with the mock service
    const errorController = new RateLimitController(mockRateLimitService);

    // Call the controller
    const response = await errorController.getAllRateLimits(context);

    // Verify the response
    assertEquals(response.status, 503);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].errorCode, 'PLATFORM_UNAVAILABLE');
    assertEquals(responseBody.errors[0].platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].error, 'Platform unavailable');
  });

  it('should handle authentication errors', async () => {
    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
      params: {
        platform: Platform.TWITTER,
        endpoint: 'test-endpoint',
      },
    });

    // Override the getRateLimitStatus method to throw an authentication error
    mockRateLimitService.getRateLimitStatus = () => {
      throw new PlatformError(
        'Authentication failed',
        Platform.TWITTER,
        ApiErrorCode.UNAUTHORIZED,
        false,
        undefined,
        401,
        'twitter-user-1',
      );
    };

    // Create a new controller with the mock service
    const errorController = new RateLimitController(mockRateLimitService);

    // Call the controller
    const response = await errorController.getRateLimitStatus(context);

    // Verify the response
    assertEquals(response.status, 401);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].errorCode, 'UNAUTHORIZED');
    assertEquals(responseBody.errors[0].platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].userId, 'twitter-user-1');
  });

  it('should handle rate limit errors', async () => {
    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
      params: {
        platform: Platform.TWITTER,
        endpoint: 'test-endpoint',
      },
    });

    // Override the getRateLimitStatus method to throw a rate limit error
    mockRateLimitService.getRateLimitStatus = () => {
      throw new PlatformError(
        'Rate limit exceeded',
        Platform.TWITTER,
        ApiErrorCode.RATE_LIMITED,
        true, // Recoverable
        undefined,
        429,
        'twitter-user-1',
        { retryAfter: 3600 }, // 1 hour
      );
    };

    // Create a new controller with the mock service
    const errorController = new RateLimitController(mockRateLimitService);

    // Call the controller
    const response = await errorController.getRateLimitStatus(context);

    // Verify the response
    assertEquals(response.status, 429);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].errorCode, 'RATE_LIMITED');
    assertEquals(responseBody.errors[0].platform, Platform.TWITTER);
    assertEquals(responseBody.errors[0].userId, 'twitter-user-1');
    assertEquals(responseBody.errors[0].recoverable, true);
    assertExists(responseBody.errors[0].details);
    assertEquals(responseBody.errors[0].details.retryAfter, 3600);
  });

  it('should handle validation errors', async () => {
    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
      params: {
        platform: Platform.TWITTER,
        endpoint: 'invalid-endpoint',
      },
    });

    // Override the getRateLimitStatus method to throw a validation error
    mockRateLimitService.getRateLimitStatus = () => {
      throw new PlatformError(
        'Invalid endpoint',
        Platform.TWITTER,
        ApiErrorCode.VALIDATION_ERROR,
        false,
        undefined,
        400,
        undefined,
        { field: 'endpoint', message: 'Endpoint not supported' },
      );
    };

    // Create a new controller with the mock service
    const errorController = new RateLimitController(mockRateLimitService);

    // Call the controller
    const response = await errorController.getRateLimitStatus(context);

    // Verify the response
    assertEquals(response.status, 400);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].errorCode, 'VALIDATION_ERROR');
    assertEquals(responseBody.errors[0].platform, Platform.TWITTER);
    assertExists(responseBody.errors[0].details);
    assertEquals(responseBody.errors[0].details.field, 'endpoint');
  });

  it('should handle KV store errors in getUsageRateLimit', async () => {
    // Create a mock context
    const context = createMockContext({
      signerId: 'test.near',
      params: {
        endpoint: 'post',
      },
    });

    // Create a mock KV store that throws an error
    const errorKvStore = new MockKvStore(['usage_rate_limit']);
    errorKvStore.get = async <T>(): Promise<T | null> => {
      throw new Error('KV store error');
    };

    // Create a new controller with the mock KV store
    const errorController = new RateLimitController(mockRateLimitService, errorKvStore);

    // Call the controller
    const response = await errorController.getUsageRateLimit(context);

    // Verify the response
    assertEquals(response.status, 500);

    const responseBody = await response.json();
    assertExists(responseBody.errors);
    assertEquals(responseBody.success, false);
    assertEquals(responseBody.errors[0].errorCode, 'INTERNAL_ERROR');
    assertEquals(responseBody.errors[0].error, 'KV store error');
  });
});
