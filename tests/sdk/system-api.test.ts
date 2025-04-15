import { assertEquals, assertExists } from 'jsr:@std/assert';
import { afterEach, beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { SystemApi } from '../../packages/sdk/src/api/system.ts';
import { Platform } from '@crosspost/types';

describe('SystemApi', () => {
  let systemApi: SystemApi;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    // Save the original fetch function
    originalFetch = globalThis.fetch;

    // Create SystemApi instance with mock options
    systemApi = new SystemApi({
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      retries: 0,
      nearAuthData: {
        account_id: 'test.near',
        public_key: 'test-public-key',
        signature: 'test-signature',
        message: 'test-message',
        nonce: new Uint8Array(32),
        recipient: 'crosspost.near',
      },
    });
  });

  afterEach(() => {
    // Restore the original fetch function
    globalThis.fetch = originalFetch;
  });

  it('should get rate limits successfully', async () => {
    // Mock fetch to return a successful response
    globalThis.fetch = async (url: string | URL | Request, _init?: RequestInit) => {
      assertEquals(url.toString().startsWith('https://api.example.com/api/rate-limit'), true);

      return new Response(
        JSON.stringify({
          platformLimits: [
            {
              platform: Platform.TWITTER,
              endpoints: {
                'tweets': {
                  endpoint: 'tweets',
                  limit: 100,
                  remaining: 95,
                  reset: new Date(Date.now() + 3600000).toISOString(),
                  resetSeconds: 3600,
                },
                'likes': {
                  endpoint: 'likes',
                  limit: 50,
                  remaining: 45,
                  reset: new Date(Date.now() + 1800000).toISOString(),
                  resetSeconds: 1800,
                },
              },
            },
          ],
          usageLimits: {
            'post': {
              endpoint: 'post',
              limit: 10,
              remaining: 8,
              reset: new Date(Date.now() + 86400000).toISOString(),
              resetSeconds: 86400,
              timeWindow: '24h',
            },
          },
          signerId: 'test.near',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    };

    // Call the API
    const response = await systemApi.getRateLimits();

    // Verify the response
    assertExists(response);
    assertEquals(response.platformLimits.length, 1);
    assertEquals(response.platformLimits[0].platform, Platform.TWITTER);
    assertEquals(Object.keys(response.platformLimits[0].endpoints).length, 2);
    assertEquals(response.platformLimits[0].endpoints.tweets.limit, 100);
    assertEquals(response.platformLimits[0].endpoints.likes.limit, 50);
    assertEquals(response.usageLimits.post.limit, 10);
    assertEquals(response.usageLimits.post.remaining, 8);
    assertEquals(response.signerId, 'test.near');
  });

  it('should get endpoint rate limit successfully', async () => {
    // Mock fetch to return a successful response
    globalThis.fetch = async (url: string | URL | Request, _init?: RequestInit) => {
      assertEquals(url.toString().includes('/api/rate-limit/post'), true);

      return new Response(
        JSON.stringify({
          platformLimits: [
            {
              platform: Platform.TWITTER,
              status: {
                endpoint: 'tweets/create',
                limit: 200,
                remaining: 195,
                reset: new Date(Date.now() + 3600000).toISOString(),
                resetSeconds: 3600,
              },
            },
          ],
          usageLimit: {
            endpoint: 'post',
            limit: 10,
            remaining: 8,
            reset: new Date(Date.now() + 86400000).toISOString(),
            resetSeconds: 86400,
            timeWindow: '24h',
          },
          endpoint: 'post',
          signerId: 'test.near',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    };

    // Call the API
    const response = await systemApi.getEndpointRateLimit('post');

    // Verify the response
    assertExists(response);
    assertEquals(response.platformLimits.length, 1);
    assertEquals(response.platformLimits[0].platform, Platform.TWITTER);
    assertEquals(response.platformLimits[0].status.endpoint, 'tweets/create');
    assertEquals(response.platformLimits[0].status.limit, 200);
    assertEquals(response.usageLimit.endpoint, 'post');
    assertEquals(response.usageLimit.limit, 10);
    assertEquals(response.endpoint, 'post');
    assertEquals(response.signerId, 'test.near');
  });

  it('should get health status successfully', async () => {
    // Mock fetch to return a successful response
    globalThis.fetch = async (url: string | URL | Request, _init?: RequestInit) => {
      assertEquals(url.toString().includes('/health'), true);

      return new Response(
        JSON.stringify({
          status: 'ok',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    };

    // Call the API
    const response = await systemApi.getHealthStatus();

    // Verify the response
    assertExists(response);
    assertEquals(response.status, 'ok');
  });

  it('should handle errors gracefully', async () => {
    // Mock fetch to return an error response
    globalThis.fetch = async (_url: string | URL | Request, _init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          error: {
            type: 'internal_error',
            message: 'Internal server error',
            status: 500,
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    };

    try {
      // Call the API
      await systemApi.getRateLimits();
      // If we get here, the test should fail
      assertEquals(true, false, 'Expected an error to be thrown');
    } catch (error) {
      // Verify the error
      assertExists(error);
      assertEquals((error as any).message.includes('Internal server error'), true);
    }
  });
});
