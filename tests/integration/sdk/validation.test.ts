import { afterEach, beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { expect } from 'jsr:@std/expect';
import { assertRejects } from 'jsr:@std/assert';
import { ApiErrorCode, Platform } from '@crosspost/types';
import { CrosspostClient } from '../../../packages/sdk/src/core/client.ts';
import { createTestServer, startTestServer } from '../utils/test-server.ts';
import { MockPostController } from '../utils/mock-controllers.ts';
import { CrosspostError } from '../../../packages/sdk/src/utils/error.ts';
import { createMockNearAuthData } from '../../utils/test-utils.ts';

describe('SDK Validation Error Handling', () => {
  let server: Deno.HttpServer;
  let serverUrl: URL;
  let client: CrosspostClient;
  
  // Setup before each test
  beforeEach(async () => {
    // Create a test server
    const app = createTestServer();
    
    // Configure routes for validation testing
    app.post('/api/post', async (c) => {
      // Always validate the request
      return MockPostController.handleCreatePost(c, {
        validateRequest: true
      });
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
  
  it('should handle missing targets validation error', async () => {
    // Create a post with missing targets
    const promise = client.post.createPost({
      targets: [], // Empty targets array will trigger validation error
      content: [{ text: 'Test post' }]
    });
    
    // Expect the request to throw a CrosspostError
    await expect(promise).rejects.toThrow(CrosspostError);
    
    try {
      await promise;
    } catch (error) {
      // Verify error details
      expect(error instanceof CrosspostError).toBe(true);
      if (error instanceof CrosspostError) {
        expect(error.code).toBe(ApiErrorCode.VALIDATION_ERROR);
        expect(error.status).toBe(400);
        expect(error.details).toBeDefined();
        expect(error.details?.field).toBe('targets');
      }
    }
  });
  
  it('should handle missing content validation error', async () => {
    // Create a post with missing content
    const promise = client.post.createPost({
      targets: [{ platform: Platform.TWITTER, userId: 'user1' }],
      content: [] // Empty content array will trigger validation error
    });
    
    // Expect the request to throw a CrosspostError
    await expect(promise).rejects.toThrow(CrosspostError);
    
    try {
      await promise;
    } catch (error) {
      // Verify error details
      expect(error instanceof CrosspostError).toBe(true);
      if (error instanceof CrosspostError) {
        expect(error.code).toBe(ApiErrorCode.VALIDATION_ERROR);
        expect(error.status).toBe(400);
        expect(error.details).toBeDefined();
        expect(error.details?.field).toBe('content');
      }
    }
  });
  
  it('should handle invalid platform validation error', async () => {
    // Create a post with invalid platform
    const promise = client.post.createPost({
      targets: [{ 
        platform: 'invalid-platform' as Platform, 
        userId: 'user1' 
      }],
      content: [{ text: 'Test post' }]
    });
    
    // Expect the request to throw a CrosspostError
    await expect(promise).rejects.toThrow(CrosspostError);
    
    try {
      await promise;
    } catch (error) {
      // Verify error details
      expect(error instanceof CrosspostError).toBe(true);
      if (error instanceof CrosspostError) {
        expect(error.code).toBe(ApiErrorCode.VALIDATION_ERROR);
        expect(error.status).toBe(400);
        expect(error.details).toBeDefined();
        expect(error.details?.field).toBe('targets.platform');
        expect(error.details?.value).toBe('invalid-platform');
      }
    }
  });
  
  it('should handle multiple validation errors in sequence', async () => {
    // First test with missing targets
    try {
      await client.post.createPost({
        targets: [],
        content: [{ text: 'Test post' }]
      });
      await assertRejects(
        () => Promise.resolve(), // This should never resolve
        Error,
        'Should have thrown an error'
      );
    } catch (error1) {
      expect(error1 instanceof CrosspostError).toBe(true);
      if (error1 instanceof CrosspostError) {
        expect(error1.code).toBe(ApiErrorCode.VALIDATION_ERROR);
        expect(error1.details?.field).toBe('targets');
      }
      
      // Then test with missing content
      try {
        await client.post.createPost({
          targets: [{ platform: Platform.TWITTER, userId: 'user1' }],
          content: []
        });
        await assertRejects(
          () => Promise.resolve(), // This should never resolve
          Error,
          'Should have thrown an error'
        );
      } catch (error2) {
        expect(error2 instanceof CrosspostError).toBe(true);
        if (error2 instanceof CrosspostError) {
          expect(error2.code).toBe(ApiErrorCode.VALIDATION_ERROR);
          expect(error2.details?.field).toBe('content');
        }
      }
    }
  });
  
  it('should handle valid request after validation errors', async () => {
    // First test with a validation error
    try {
      await client.post.createPost({
        targets: [],
        content: [{ text: 'Test post' }]
      });
      await assertRejects(
        () => Promise.resolve(), // This should never resolve
        Error,
        'Should have thrown an error'
      );
    } catch (error) {
      expect(error instanceof CrosspostError).toBe(true);
      
      // Override fetch to bypass validation for this test
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (input, init) => {
        if (input instanceof URL || typeof input === 'string') {
          // Mock a successful response
          return new Response(JSON.stringify({
            success: true,
            data: {
              summary: { total: 1, succeeded: 1, failed: 0 },
              results: [{
                platform: Platform.TWITTER,
                userId: 'user1',
                status: 'success',
                details: {
                  id: 'post-1',
                  text: 'Test post',
                  createdAt: new Date().toISOString()
                }
              }],
              errors: []
            },
            meta: {
              requestId: crypto.randomUUID(),
              timestamp: new Date().toISOString()
            }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return originalFetch(input, init);
      };
      
      try {
        // Now try a valid request
        const response = await client.post.createPost({
          targets: [{ platform: Platform.TWITTER, userId: 'user1' }],
          content: [{ text: 'Test post' }]
        });
        
        // Verify success response
        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        
        // Check multi-status data
        const multiStatusData = response.data as any;
        expect(multiStatusData.summary).toBeDefined();
        expect(multiStatusData.summary.total).toBe(1);
        expect(multiStatusData.summary.succeeded).toBe(1);
        expect(multiStatusData.summary.failed).toBe(0);
        
        // Check successful results
        expect(multiStatusData.results).toHaveLength(1);
        expect(multiStatusData.errors).toHaveLength(0);
      } finally {
        // Restore original fetch
        globalThis.fetch = originalFetch;
      }
    }
  });
});
