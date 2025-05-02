import { ApiErrorCode, ApiResponse } from '@crosspost/types';
import { expect } from 'jsr:@std/expect';
import { afterEach, beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { CrosspostClient } from '../../../packages/sdk/src/core/client.ts';
import { makeRequest, type RequestOptions } from '../../../packages/sdk/src/core/request.ts';
import { CrosspostError, isValidationError } from '../../../packages/sdk/src/utils/error.ts';
import { createMockNearAuthData } from '../../utils/test-utils.ts';
import { createTestServer, startTestServer } from '../utils/test-server.ts';

/**
 * Test validation API for SDK integration tests
 */
class ValidationTestApi {
  private options: RequestOptions;

  /**
   * Creates an instance of ValidationTestApi
   * @param options Request options
   */
  constructor(options: RequestOptions) {
    this.options = options;
  }

  /**
   * Test body validation with a request that will be validated
   * @param data Request body data
   * @returns A promise resolving with the API response
   */
  async testBodyValidation<T>(data: unknown): Promise<ApiResponse<T>> {
    return makeRequest<T, unknown>(
      'POST',
      '/api/validation-test/body',
      this.options,
      data,
    );
  }

  /**
   * Test query validation with a request that will be validated
   * @param query Query parameters
   * @returns A promise resolving with the API response
   */
  async testQueryValidation<T>(query: Record<string, string | number>): Promise<ApiResponse<T>> {
    return makeRequest<T, never, Record<string, string | number>>(
      'GET',
      '/api/validation-test/query',
      this.options,
      undefined,
      query,
    );
  }

  /**
   * Test params validation with a request that will be validated
   * @param id ID parameter (must be a valid UUID)
   * @param category Category parameter (must be 'news', 'sports', or 'tech')
   * @returns A promise resolving with the API response
   */
  async testParamsValidation<T>(id: string, category: string): Promise<ApiResponse<T>> {
    return makeRequest<T>(
      'GET',
      `/api/validation-test/params/${id}/${category}`,
      this.options,
    );
  }
}

describe('SDK Validation Error Handling', () => {
  let server: Deno.HttpServer;
  let serverUrl: URL;
  let client: CrosspostClient;
  let validationApi: ValidationTestApi;

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
    const mockAuthData = createMockNearAuthData('test.near');
    client.setAuthentication(mockAuthData);

    // Create validation test API
    validationApi = new ValidationTestApi({
      baseUrl: serverUrl,
      timeout: 5000,
      nearAuthData: mockAuthData,
    });
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

  it('should handle body validation errors with missing required field', async () => {
    // Missing required field
    const promise = validationApi.testBodyValidation({
      // Missing requiredField
      numericField: 10,
      arrayField: ['item1'],
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
      }
    }
  });

  it('should handle body validation errors with invalid numeric field', async () => {
    // Invalid numeric field (negative number)
    const promise = validationApi.testBodyValidation({
      requiredField: 'test',
      numericField: -5, // Should be positive
      arrayField: ['item1'],
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
      }
    }
  });

  it('should handle query validation errors', async () => {
    // Missing required query parameter
    const promise = validationApi.testQueryValidation({
      // Missing requiredParam
      numericParam: 10,
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
      }
    }
  });

  it('should handle params validation errors', async () => {
    // Invalid UUID and category
    const promise = validationApi.testParamsValidation('not-a-uuid', 'invalid-category');

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
      }
    }
  });

  it('should handle successful validation', async () => {
    // Valid body data
    const response = await validationApi.testBodyValidation({
      requiredField: 'test',
      numericField: 10,
      arrayField: ['item1', 'item2'],
    });

    // Verify success response
    expect(response).toBeDefined();
    expect((response as any).success).toBe(true);
    expect((response as any).data).toBeDefined();
  });

  it('should correctly identify validation errors using isValidationError helper', async () => {
    // Missing required field
    const promise = validationApi.testBodyValidation({
      // Missing requiredField
      numericField: 10,
      arrayField: ['item1'],
    });

    try {
      await promise;
    } catch (error) {
      // Test isValidationError helper function
      expect(isValidationError(error)).toBe(true);

      // Test with other error types for comparison
      expect(isValidationError(new Error('Generic error'))).toBe(false);
      expect(isValidationError(null)).toBe(false);
      expect(isValidationError(undefined)).toBe(false);

      // Create a non-validation CrosspostError for comparison
      const nonValidationError = new CrosspostError(
        'Not a validation error',
        ApiErrorCode.NETWORK_ERROR,
        500,
      );
      expect(isValidationError(nonValidationError)).toBe(false);
    }
  });
});
