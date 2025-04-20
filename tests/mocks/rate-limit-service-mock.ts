import { ApiErrorCode, Platform, PlatformName, RateLimitStatus } from '@crosspost/types';
import { Env } from '../../src/config/env.ts';
import { RateLimitService } from '../../src/domain/services/rate-limit.service.ts';
import { createPlatformError } from '../../src/errors/platform-error.ts';
import { MockKvStore } from './kv-store-mock.ts';

/**
 * Mock implementation of RateLimitService for testing
 */
export class MockRateLimitService extends RateLimitService {
  constructor() {
    // Create a mock KV store for rate limits
    const kvStore = new MockKvStore(['usage_rate_limit']);
    super({} as Env, new Map());
  }

  // Override methods with mock implementations
  override async getRateLimitStatus(
    _platform: PlatformName,
    endpoint: string,
    _version?: string,
  ): Promise<RateLimitStatus> {
    return {
      endpoint: endpoint || 'test-endpoint',
      limit: 100,
      remaining: 95,
      reset: new Date(Date.now() + 3600000).toISOString(),
      resetSeconds: 3600,
    };
  }

  override async getAllRateLimits(
    _platform: PlatformName,
  ): Promise<Record<string, RateLimitStatus>> {
    return {
      'app': {
        endpoint: 'app',
        limit: 1000,
        remaining: 950,
        reset: new Date(Date.now() + 3600000).toISOString(),
        resetSeconds: 3600,
      },
      'endpoint1': {
        endpoint: 'endpoint1',
        limit: 100,
        remaining: 95,
        reset: new Date(Date.now() + 3600000).toISOString(),
        resetSeconds: 3600,
      },
      'endpoint2': {
        endpoint: 'endpoint2',
        limit: 50,
        remaining: 45,
        reset: new Date(Date.now() + 1800000).toISOString(),
        resetSeconds: 1800,
      },
    };
  }

  override async canPerformAction(
    _platform: PlatformName,
    _action?: string,
  ): Promise<boolean> {
    return true;
  }

  override isRateLimited(
    _platform: PlatformName,
    rateLimitStatus: RateLimitStatus | null,
  ): boolean {
    if (!rateLimitStatus) return false;
    return rateLimitStatus.remaining <= 0;
  }

  override isRateLimitObsolete(
    _platform: PlatformName,
    rateLimitStatus: RateLimitStatus | null,
  ): boolean {
    if (!rateLimitStatus) return true;
    const resetTime = new Date(rateLimitStatus.reset).getTime();
    return resetTime < Date.now();
  }

  // Create an error-throwing version for testing error handling
  static createErrorMock(): MockRateLimitService {
    const errorMock = new MockRateLimitService();
    errorMock.getRateLimitStatus = () => {
      throw createPlatformError(
        ApiErrorCode.INTERNAL_ERROR,
        'Test error',
        Platform.TWITTER,
      );
    };
    return errorMock;
  }
}
