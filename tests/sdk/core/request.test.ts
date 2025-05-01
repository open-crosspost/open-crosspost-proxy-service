import { afterEach, beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { expect } from 'jsr:@std/expect';
import { stub } from 'jsr:@std/testing/mock';
import { FakeTime } from 'jsr:@std/testing/time';
import { assertRejects } from 'jsr:@std/assert';

import { makeRequest, type RequestOptions } from '../../../packages/sdk/src/core/request.ts';
import { CrosspostError } from '../../../packages/sdk/src/utils/error.ts';
import { ApiErrorCode, type ApiResponse, type ErrorDetail } from '@crosspost/types';
import type { NearAuthData } from 'near-sign-verify';

function assertCrosspostError(error: unknown): asserts error is CrosspostError {
  expect(error).toBeInstanceOf(CrosspostError);
}

async function expectCrosspostError(promise: Promise<unknown>): Promise<CrosspostError> {
  const error = await promise.catch((e) => e);
  assertCrosspostError(error);
  return error;
}

const MOCK_BASE_URL = 'https://api.example.com';
const MOCK_NEAR_AUTH_DATA: NearAuthData = {
  account_id: 'test.near',
  public_key: 'ed25519:test',
  signature: 'test_sig',
  message: 'test_msg',
  nonce: new Uint8Array(32),
  recipient: 'crosspost-api.near',
};

const MOCK_REQUEST_OPTIONS: RequestOptions = {
  baseUrl: MOCK_BASE_URL,
  nearAuthData: MOCK_NEAR_AUTH_DATA,
  timeout: 1000,
};

const MOCK_GET_OPTIONS: RequestOptions = {
  baseUrl: MOCK_BASE_URL,
  nearAccount: 'test.near',
  timeout: 1000,
};

function createMockResponse(
  body: Record<string, unknown> | string,
  status: number,
  ok: boolean,
  headers?: HeadersInit,
): Response {
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(bodyString, {
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function mockSuccessResponse<T>(data: T): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
    meta: { requestId: 'req-123', timestamp: '2025-01-01T00:00:00.000Z' },
  };
  return createMockResponse(body as any, 200, true);
}

function mockErrorResponse(errors: ErrorDetail[], status: number): Response {
  const body: ApiResponse<never> = {
    success: false,
    errors,
    meta: { requestId: 'req-123', timestamp: '2025-01-01T00:00:00.000Z' },
  };
  return createMockResponse(body as any, status, false);
}

describe('makeRequest', () => {
  let time: FakeTime;

  beforeEach(async () => {
    try {
      if (time) {
        time.restore();
      }
    } catch {
      // Ignore any errors from previous test cleanup
    }

    await new Promise((resolve) => setTimeout(resolve, 0));

    time = new FakeTime();
  });

  afterEach(async () => {
    try {
      if (time) {
        await time.runMicrotasks();
        time.restore();
      }
    } catch {
      // Ignore cleanup errors
    }
    // Ensure we run any remaining microtasks to avoid dangling promises
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('should make a successful GET request', async () => {
    const mockData = { id: 1, name: 'Test Data' };
    const fetchStub = stub(
      globalThis,
      'fetch',
      () => Promise.resolve(mockSuccessResponse(mockData)),
    );

    try {
      const result = await makeRequest<{ id: number; name: string }>(
        'GET',
        '/test',
        MOCK_GET_OPTIONS,
      );
      expect(result).toEqual({
        success: true,
        data: mockData,
        meta: { requestId: 'req-123', timestamp: '2025-01-01T00:00:00.000Z' },
      });
      expect(fetchStub.calls.length).toBe(1);
      const urlArg = fetchStub.calls[0].args[0];
      const optionsArg = fetchStub.calls[0].args[1];
      expect(optionsArg?.method).toBe('GET');
      const headers = new Headers(optionsArg?.headers);
      expect(headers.get('X-Near-Account')).toBe('test.near');
      expect(urlArg).toBe(`${MOCK_BASE_URL}/test`);
    } finally {
      fetchStub.restore();
    }
  });

  it('should make a successful POST request', async () => {
    const mockData = { success: true, id: 'post-1' };
    const requestBody = { content: 'Hello' };
    const fetchStub = stub(
      globalThis,
      'fetch',
      () => Promise.resolve(mockSuccessResponse(mockData)),
    );

    try {
      const result = await makeRequest<{ success: boolean; id: string }, { content: string }>(
        'POST',
        '/posts',
        MOCK_REQUEST_OPTIONS,
        requestBody,
      );

      expect(result).toEqual({
        success: true,
        data: mockData,
        meta: { requestId: 'req-123', timestamp: '2025-01-01T00:00:00.000Z' },
      });
      expect(fetchStub.calls.length).toBe(1);
      const urlArg = fetchStub.calls[0].args[0];
      const optionsArg = fetchStub.calls[0].args[1];
      expect(optionsArg?.method).toBe('POST');
      const headers = new Headers(optionsArg?.headers);
      expect(headers.get('Authorization')).toMatch(/^Bearer .+$/);
      expect(urlArg).toBe(`${MOCK_BASE_URL}/posts`);
      expect(optionsArg?.body).toBe(JSON.stringify(requestBody));
    } finally {
      fetchStub.restore();
    }
  });

  it('should handle API errors', async () => {
    const validationError: ErrorDetail = {
      message: 'Validation failed',
      code: ApiErrorCode.VALIDATION_ERROR,
      recoverable: false,
      details: { field: 'email' },
    };
    const fetchStub = stub(
      globalThis,
      'fetch',
      () => Promise.resolve(mockErrorResponse([validationError], 400)),
    );

    try {
      await assertRejects(
        () => makeRequest('POST', '/submit', MOCK_REQUEST_OPTIONS, { email: 'invalid' }),
        CrosspostError,
        validationError.message,
      );

      expect(fetchStub.calls.length).toBe(1);
    } finally {
      fetchStub.restore();
    }
  });

  it('should handle network errors', async () => {
    const fetchStub = stub(globalThis, 'fetch', () => {
      return Promise.reject(new TypeError('Network request failed'));
    });

    try {
      const error = await expectCrosspostError(
        makeRequest('GET', '/data', MOCK_GET_OPTIONS),
      );
      expect(error.code).toBe(ApiErrorCode.INTERNAL_ERROR);
      expect(error.status).toBe(500);
      expect(fetchStub.calls.length).toBe(1);
    } finally {
      fetchStub.restore();
    }
  });

  it('should handle timeouts', async () => {
    const fetchStub = stub(globalThis, 'fetch', (_input, options) => {
      return new Promise((_, reject) => {
        options?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        }, { once: true });
      });
    });

    try {
      const error = await expectCrosspostError(
        Promise.race([
          makeRequest('GET', '/slow-data', MOCK_GET_OPTIONS),
          time.tickAsync(MOCK_REQUEST_OPTIONS.timeout).then(() => time.runMicrotasks()),
        ]),
      );
      expect(error.code).toBe(ApiErrorCode.NETWORK_ERROR);
      expect(error.status).toBe(408);
      expect(fetchStub.calls.length).toBe(1);
    } finally {
      fetchStub.restore();
    }
  });

  it('should handle non-JSON error responses', async () => {
    const errorText = 'Internal Server Error - HTML Page';
    const fetchStub = stub(globalThis, 'fetch', () => {
      return Promise.resolve(
        new Response(errorText, {
          status: 500,
          statusText: 'Error',
          headers: { 'Content-Type': 'text/html' },
        }),
      );
    });

    try {
      const error = await expectCrosspostError(
        makeRequest('GET', '/server-error', MOCK_GET_OPTIONS),
      );
      expect(error.code).toBe(ApiErrorCode.INVALID_RESPONSE);
      expect(error.status).toBe(500);
      expect(error.recoverable).toBe(false);
      expect(fetchStub.calls.length).toBe(1);
    } finally {
      fetchStub.restore(); // Add finally block back
    }
  });

  it('should handle invalid JSON on success response', async () => {
    const invalidJson = '{"success": true, "data": {';
    const fetchStub = stub(globalThis, 'fetch', () =>
      Promise.resolve(
        createMockResponse(invalidJson, 200, true),
      ));

    try {
      const error = await expectCrosspostError(
        makeRequest('GET', '/malformed-success', MOCK_GET_OPTIONS),
      );
      expect(error.code).toBe(ApiErrorCode.INVALID_RESPONSE);
      expect(error.status).toBe(200);
      expect(error.recoverable).toBe(false);
      expect(fetchStub.calls.length).toBe(1);
    } finally {
      fetchStub.restore(); // Add finally block back
    }
  });

  it('should handle success: false on success response', async () => {
    const errorDetail: ErrorDetail = {
      message: 'Operation partially failed',
      code: ApiErrorCode.MULTI_STATUS,
      recoverable: false,
    };
    const body = {
      success: false,
      errors: [errorDetail],
      meta: { requestId: 'req-789', timestamp: '' },
    };
    const fetchStub = stub(globalThis, 'fetch', () =>
      Promise.resolve( // Use correct stubbing
        createMockResponse(body as any, 200, true),
      ));

    try {
      const error = await expectCrosspostError(
        makeRequest('POST', '/partial-op', MOCK_REQUEST_OPTIONS),
      );
      expect(error.code).toBe(ApiErrorCode.MULTI_STATUS);
      expect(error.status).toBe(200);
      expect(error.recoverable).toBe(false);
      expect(fetchStub.calls.length).toBe(1);
    } finally {
      fetchStub.restore(); // Add finally block back
    }
  });

  it('should throw UNAUTHORIZED if nearAuthData missing for non-GET', async () => {
    const optionsWithoutAuth = { ...MOCK_REQUEST_OPTIONS, nearAuthData: undefined };
    const fetchStub = stub(globalThis, 'fetch', () => Promise.resolve(new Response()));

    try {
      const error = await expectCrosspostError(
        makeRequest('POST', '/needs-auth', optionsWithoutAuth),
      );
      expect(error.code).toBe(ApiErrorCode.UNAUTHORIZED);
      expect(error.status).toBe(401);
      expect(fetchStub.calls.length).toBe(0);
    } finally {
      fetchStub.restore(); // Add finally block back
    }
  });

  it('should throw UNAUTHORIZED if nearAccount missing for GET', async () => {
    const optionsWithoutAccount = { ...MOCK_GET_OPTIONS, nearAccount: undefined };
    const fetchStub = stub(globalThis, 'fetch', () => Promise.resolve(new Response()));

    try {
      const error = await expectCrosspostError(
        makeRequest('GET', '/needs-account', optionsWithoutAccount),
      );
      expect(error.code).toBe(ApiErrorCode.UNAUTHORIZED);
      expect(error.status).toBe(401);
      expect(fetchStub.calls.length).toBe(0);
    } finally {
      fetchStub.restore(); // Add finally block back
    }
  });
});
