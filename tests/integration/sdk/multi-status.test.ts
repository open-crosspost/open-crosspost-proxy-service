import { ApiErrorCode, Platform } from '@crosspost/types';
import { expect } from 'jsr:@std/expect';
import { afterEach, beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { CrosspostClient } from '../../../packages/sdk/src/core/client.ts';
import { createMockNearAuthData } from '../../utils/test-utils.ts';
import { createRealControllerTestServer, startTestServer } from '../utils/test-server.ts';

describe('SDK Multi-Status Response Handling', () => {
  let server: Deno.HttpServer;
  let serverUrl: URL;
  let client: CrosspostClient;

  // Setup before each test
  beforeEach(async () => {
    // Create a test server with real controller logic
    const app = createRealControllerTestServer();

    // Start the server with dynamic port assignment
    const { server: testServer, url } = await startTestServer(app);
    server = testServer;
    serverUrl = url;

    // Create SDK client
    client = new CrosspostClient({
      baseUrl: serverUrl.toString()
    });

    // Set proper authentication for both GET and POST requests
    const mockAuthData = createMockNearAuthData('test.near');
    client.setAuthentication(mockAuthData);
  });

  // Cleanup after each test
  afterEach(async () => {
    try {
      // Stop the server
      await server.shutdown();
    } catch (error) {
      // Ignore errors during shutdown
      console.error('Error during server shutdown:', error);
    }
  });

  it('should handle multi-status response with partial success', async () => {
    // Create a post with multiple targets and partial success trigger
    const response = await client.post.createPost({
      targets: [
        { platform: Platform.TWITTER, userId: 'user1' },
        { platform: Platform.TWITTER, userId: 'user2' }
      ],
      content: [{ text: 'partial success test' }]
    });

    // Verify response structure
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();

    // Check multi-status data
    const multiStatusData = response.data as any;
    expect(multiStatusData.summary).toBeDefined();
    expect(multiStatusData.summary.total).toBe(2);
    expect(multiStatusData.summary.succeeded).toBe(1);
    expect(multiStatusData.summary.failed).toBe(1);

    // Check successful results
    expect(multiStatusData.results).toHaveLength(1);
    expect(multiStatusData.results[0].platform).toBe(Platform.TWITTER);
    expect(multiStatusData.results[0].status).toBe('success');
    expect(multiStatusData.results[0].details).toBeDefined();
    expect(multiStatusData.results[0].details.id).toBeDefined();

    // Check error details
    expect(multiStatusData.errors).toHaveLength(1);
    expect(multiStatusData.errors[0].code).toBe(ApiErrorCode.PLATFORM_ERROR);
    expect(multiStatusData.errors[0].details.platform).toBe(Platform.TWITTER);
  });

  it('should handle complete success for all targets', async () => {
    // Create a post with multiple targets and all_success trigger
    const response = await client.post.createPost({
      targets: [
        { platform: Platform.TWITTER, userId: 'user1' },
        { platform: Platform.TWITTER, userId: 'user2' }
      ],
      content: [{ text: 'all_success test' }]
    });

    // Verify response structure
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();

    // Check multi-status data
    const multiStatusData = response.data as any;
    expect(multiStatusData.summary).toBeDefined();
    expect(multiStatusData.summary.total).toBe(2);
    expect(multiStatusData.summary.succeeded).toBe(2);
    expect(multiStatusData.summary.failed).toBe(0);

    // Check successful results
    expect(multiStatusData.results).toHaveLength(2);
    expect(multiStatusData.errors).toHaveLength(0);
  });

  it('should handle complete failure for all targets', async () => {
    // Create a post with multiple targets and all_error trigger
    const response = await client.post.createPost({
      targets: [
        { platform: Platform.TWITTER, userId: 'user1' },
        { platform: Platform.TWITTER, userId: 'user2' }
      ],
      content: [{ text: 'all_error test' }]
    });

    // Verify response structure
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();

    // Check multi-status data
    const multiStatusData = response.data as any;
    expect(multiStatusData.summary).toBeDefined();
    expect(multiStatusData.summary.total).toBe(2);
    expect(multiStatusData.summary.succeeded).toBe(0);
    expect(multiStatusData.summary.failed).toBe(2);

    // Check error details
    expect(multiStatusData.results).toHaveLength(0);
    expect(multiStatusData.errors).toHaveLength(2);
    expect(multiStatusData.errors[0].code).toBe(ApiErrorCode.PLATFORM_ERROR);
    expect(multiStatusData.errors[1].code).toBe(ApiErrorCode.PLATFORM_ERROR);
  });

  it('should handle specific error codes', async () => {
    // Create a post with multiple targets and specific error code trigger
    const response = await client.post.createPost({
      targets: [
        { platform: Platform.TWITTER, userId: 'user1' },
        { platform: Platform.TWITTER, userId: 'user2' }
      ],
      content: [{ text: 'all_error:RATE_LIMITED test' }]
    });

    // Verify response structure
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();

    // Check multi-status data
    const multiStatusData = response.data as any;
    expect(multiStatusData.summary).toBeDefined();
    expect(multiStatusData.summary.total).toBe(2);
    expect(multiStatusData.summary.succeeded).toBe(0);
    expect(multiStatusData.summary.failed).toBe(2);

    // Check error details with specific error code
    expect(multiStatusData.results).toHaveLength(0);
    expect(multiStatusData.errors).toHaveLength(2);
    expect(multiStatusData.errors[0].code).toBe(ApiErrorCode.RATE_LIMITED);
    expect(multiStatusData.errors[1].code).toBe(ApiErrorCode.RATE_LIMITED);
  });

  it('should handle thrown errors', async () => {
    // Create a post with throw_error trigger
    const promise = client.post.createPost({
      targets: [
        { platform: Platform.TWITTER, userId: 'user1' }
      ],
      content: [{ text: 'throw_error test' }]
    });

    // Expect the request to throw a CrosspostError
    await expect(promise).rejects.toThrow();
  });
});
