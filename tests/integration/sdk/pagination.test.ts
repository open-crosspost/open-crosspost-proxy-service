import { ActivityLeaderboardResponse, TimePeriod } from '@crosspost/types';
import { expect } from 'jsr:@std/expect';
import { afterEach, beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { CrosspostClient } from '../../../packages/sdk/src/core/client.ts';
import { createMockAuthToken } from '../../utils/test-utils.ts';
import { createTestServer, startTestServer } from '../utils/test-server.ts';

describe('SDK Pagination Handling', () => {
  let server: Deno.HttpServer;
  let serverUrl: URL;
  let client: CrosspostClient;

  // Setup before each test
  beforeEach(async () => {
    // Create a test server with real controller logic
    const app = createTestServer();

    // Start the server with dynamic port assignment
    const { server: testServer, url } = await startTestServer(app);
    server = testServer;
    serverUrl = url;

    // Create SDK client
    client = new CrosspostClient({
      baseUrl: serverUrl.toString(),
    });

    // Set proper authentication for both GET and POST requests
    const mockAuthData = createMockAuthToken('test.near');
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

  it('should handle paginated leaderboard response with offset', async () => {
    // Get leaderboard with pagination parameters for second page (using offset)
    const limit = 5;
    const offset = 5; // This is equivalent to page 2 with 5 items per page

    const response = await client.activity.getLeaderboard({
      limit,
      offset,
    });

    // Verify response structure
    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.meta).toBeDefined();

    // Check pagination metadata
    expect(response.meta.pagination).toBeDefined();
    expect(response.meta.pagination?.limit).toBe(limit);
    expect(response.meta.pagination?.offset).toBe(offset);
    expect(response.meta.pagination?.total).toBe(100);

    // Check leaderboard data
    const leaderboardData = response.data as ActivityLeaderboardResponse;
    expect(leaderboardData.entries.length).toBeGreaterThan(0);
    expect(leaderboardData.timeframe).toBe(TimePeriod.ALL);

    // Check that entries have the correct rank range based on offset
    const ranks = leaderboardData.entries.map((entry) => entry.rank);
    expect(Math.min(...ranks)).toBeGreaterThan(offset); // First entry should have rank > offset
  });

  it('should handle first page with zero offset', async () => {
    // Get first page of leaderboard (offset 0)
    const limit = 10;
    const offset = 0;

    const response = await client.activity.getLeaderboard({
      limit,
      offset,
    });

    // Verify pagination metadata
    expect(response.meta.pagination).toBeDefined();
    expect(response.meta.pagination?.limit).toBe(limit);
    expect(response.meta.pagination?.offset).toBe(offset);
    expect(response.meta.pagination?.total).toBe(100);

    // Check leaderboard data
    const leaderboardData = response.data as ActivityLeaderboardResponse;
    expect(leaderboardData.entries.length).toBeGreaterThan(0);

    // Check that entries start from rank 1
    const ranks = leaderboardData.entries.map((entry) => entry.rank);
    expect(Math.min(...ranks)).toBe(1);
  });

  it('should handle high offset value for last entries', async () => {
    // Get entries with high offset (equivalent to last page)
    const limit = 10;
    const offset = 90; // This would be the last page in a 100-item dataset

    const response = await client.activity.getLeaderboard({
      limit,
      offset,
    });

    // Verify pagination metadata
    expect(response.meta.pagination).toBeDefined();
    expect(response.meta.pagination?.limit).toBe(limit);
    expect(response.meta.pagination?.offset).toBe(offset);
    expect(response.meta.pagination?.total).toBe(100);

    // Check leaderboard data
    const leaderboardData = response.data as ActivityLeaderboardResponse;
    expect(leaderboardData.entries.length).toBeGreaterThan(0);

    // Check that entries have high rank values
    const ranks = leaderboardData.entries.map((entry) => entry.rank);
    expect(Math.min(...ranks)).toBeGreaterThan(offset);
  });

  it('should handle custom limit size', async () => {
    // Get leaderboard with custom limit size
    const limit = 20;

    const response = await client.activity.getLeaderboard({
      limit,
    });

    // Verify pagination metadata
    expect(response.meta.pagination).toBeDefined();
    expect(response.meta.pagination?.limit).toBe(limit);

    // Check leaderboard data
    const leaderboardData = response.data as ActivityLeaderboardResponse;
    expect(leaderboardData.entries.length).toBeGreaterThan(0);
    expect(leaderboardData.entries.length).toBeLessThanOrEqual(limit);
  });
});
