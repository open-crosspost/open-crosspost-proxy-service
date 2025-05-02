import { ActivityLeaderboardResponse, TimePeriod } from '@crosspost/types';
import { expect } from 'jsr:@std/expect';
import { afterEach, beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { CrosspostClient } from '../../../packages/sdk/src/core/client.ts';
import { MockActivityController } from '../utils/mock-controllers.ts';
import { createTestServer, startTestServer } from '../utils/test-server.ts';
import { createMockNearAuthData } from '../../utils/test-utils.ts';

describe('SDK Pagination Handling', () => {
  let server: Deno.HttpServer;
  let serverUrl: URL;
  let client: CrosspostClient;

  // Setup before each test
  beforeEach(async () => {
    // Create a test server
    const app = createTestServer();

    // Configure routes
    app.get('/api/activity', async (c) => {
      return MockActivityController.handleGetLeaderboard(c);
    });

    app.get('/api/activity/:signerId', async (c) => {
      return MockActivityController.handleGetAccountActivity(c);
    });

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

  it('should handle paginated leaderboard response', async () => {
    // Mock the fetch to ensure consistent pagination parameters
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      if (input instanceof URL || typeof input === 'string') {
        const url = new URL(input, serverUrl);
        if (url.pathname === '/api/activity') {
          // Force page 2 with 5 items per page
          url.searchParams.set('page', '2');
          url.searchParams.set('limit', '5');
          return originalFetch(url, init);
        }
      }
      return originalFetch(input, init);
    };

    try {
      // Get leaderboard with pagination parameters
      const response = await client.activity.getLeaderboard({
        limit: 5,
        offset: 5
      });

      // Verify response structure
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.meta).toBeDefined();

      // Check pagination metadata
      expect(response.meta.pagination).toBeDefined();
      expect(response.meta.pagination?.page).toBe(2); // Explicitly check for page 2
      expect(response.meta.pagination?.perPage).toBe(5);
      expect(response.meta.pagination?.total).toBe(100);
      expect(response.meta.pagination?.totalPages).toBe(20);
      expect(response.meta.pagination?.nextCursor).toBe('3');
      expect(response.meta.pagination?.prevCursor).toBe('1');

      // Check leaderboard data
      const leaderboardData = response.data as ActivityLeaderboardResponse;
      expect(leaderboardData.entries).toHaveLength(5);
      expect(leaderboardData.timeframe).toBe(TimePeriod.ALL);

      // Check that entries have the correct rank range for page 2
      const ranks = leaderboardData.entries.map(entry => entry.rank);
      expect(Math.min(...ranks)).toBe(6); // First entry on page 2 should be rank 6
      expect(Math.max(...ranks)).toBe(10); // Last entry on page 2 should be rank 10
    } finally {
      // Restore original fetch
      globalThis.fetch = originalFetch;
    }
  });

  it('should handle first page with no previous cursor', async () => {
    // Override fetch to modify pagination parameters
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      if (input instanceof URL || typeof input === 'string') {
        const url = new URL(input, serverUrl);
        if (url.pathname === '/api/activity') {
          // Force page 1
          url.searchParams.set('page', '1');
          url.searchParams.set('limit', '10');
          return originalFetch(url, init);
        }
      }
      return originalFetch(input, init);
    };

    try {
      // Get first page of leaderboard
      const response = await client.activity.getLeaderboard();

      // Verify pagination metadata
      expect(response.meta.pagination).toBeDefined();
      expect(response.meta.pagination?.page).toBe(1);
      expect(response.meta.pagination?.nextCursor).toBe('2');
      expect(response.meta.pagination?.prevCursor).toBeUndefined();

      // Check leaderboard data
      const leaderboardData = response.data as ActivityLeaderboardResponse;
      expect(leaderboardData.entries).toHaveLength(10);

      // Check that entries have the correct rank range for page 1
      const ranks = leaderboardData.entries.map(entry => entry.rank);
      expect(Math.min(...ranks)).toBe(1);
      expect(Math.max(...ranks)).toBe(10);
    } finally {
      // Restore original fetch
      globalThis.fetch = originalFetch;
    }
  });

  it('should handle last page with no next cursor', async () => {
    // Override fetch to modify pagination parameters
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      if (input instanceof URL || typeof input === 'string') {
        const url = new URL(input, serverUrl);
        if (url.pathname === '/api/activity') {
          // Force last page
          url.searchParams.set('page', '10');
          url.searchParams.set('limit', '10');
          return originalFetch(url, init);
        }
      }
      return originalFetch(input, init);
    };

    try {
      // Get last page of leaderboard
      const response = await client.activity.getLeaderboard();

      // Verify pagination metadata
      expect(response.meta.pagination).toBeDefined();
      expect(response.meta.pagination?.page).toBe(10);
      expect(response.meta.pagination?.nextCursor).toBeUndefined();
      expect(response.meta.pagination?.prevCursor).toBe('9');

      // Check leaderboard data
      const leaderboardData = response.data as ActivityLeaderboardResponse;
      expect(leaderboardData.entries.length).toBeGreaterThan(0);

      // Check that entries have the correct rank range for page 10
      const ranks = leaderboardData.entries.map(entry => entry.rank);
      expect(Math.min(...ranks)).toBe(91);
    } finally {
      // Restore original fetch
      globalThis.fetch = originalFetch;
    }
  });

  it('should handle custom page size', async () => {
    // Get leaderboard with custom page size
    const response = await client.activity.getLeaderboard({
      limit: 20
    });

    // Verify pagination metadata
    expect(response.meta.pagination).toBeDefined();
    expect(response.meta.pagination?.perPage).toBe(20);

    // Check leaderboard data
    const leaderboardData = response.data as ActivityLeaderboardResponse;
    expect(leaderboardData.entries).toHaveLength(20);
  });
});
