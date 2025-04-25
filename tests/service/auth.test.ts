import { 
  ApiErrorCode, 
  Platform, 
  AuthInitRequestSchema,
  AuthCallbackQuerySchema,
  AuthTokenRequestSchema,
  NearAuthorizationRequestSchema
} from '@crosspost/types';
import { assertEquals, assertExists } from 'jsr:@std/assert';
import { beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { Env } from '../../src/config/env.ts';
import { AuthController } from '../../src/controllers/auth.controller.ts';
import type { Hono as HonoType } from '../../src/deps.ts';
import { createPlatformError } from '../../src/errors/platform-error.ts';
import { ValidationMiddleware } from '../../src/middleware/validation.middleware.ts';
import { setupTestApp, type TestAppEnv } from '../utils/test-utils.ts';

describe('Auth Controller', () => {
  let app: HonoType<TestAppEnv>;
  let authController: AuthController;
  let mockAuthService: any;
  let mockNearAuthService: any;
  let mockEnv: Env;

  beforeEach(() => {
    // Create mock auth service
    mockAuthService = {
      initializeAuth: () =>
        Promise.resolve({
          authUrl: 'https://example.com/auth',
          state: 'mock-state',
        }),
      getAuthState: () =>
        Promise.resolve({
          successUrl: 'https://example.com/success',
          errorUrl: 'https://example.com/error',
        }),
      handleCallback: () =>
        Promise.resolve({
          userId: 'twitter-user-id',
          successUrl: 'https://example.com/success',
        }),
      refreshToken: () =>
        Promise.resolve({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        }),
      revokeToken: () => Promise.resolve(true),
      hasValidTokens: () => Promise.resolve(true),
      getUserProfile: () =>
        Promise.resolve({
          id: 'twitter-user-id',
          username: 'twitteruser',
          displayName: 'Twitter User',
        }),
    };

    const mockPlatformAuth = {
      getAuthState: () =>
        Promise.resolve({
          successUrl: 'https://example.com/success',
          errorUrl: 'https://example.com/error',
          redirect: false, // Default to popup flow
          origin: 'https://test-origin.com',
        }),
    };
    mockAuthService.getPlatformAuth = () => mockPlatformAuth;

    // Create mock token manager
    mockNearAuthService = {
      validateNearAuthSignature: () => Promise.resolve('test.near'),
      getNearAuthorizationStatus: () => Promise.resolve(1), // Authorized
      authorizeNearAccount: () => Promise.resolve({ success: true }),
      unauthorizeNearAccount: () => Promise.resolve({ success: true }),
      saveTokens: () => Promise.resolve(),
      linkAccount: () => Promise.resolve(),
      unlinkAccount: () => Promise.resolve(),
      deleteTokens: () => Promise.resolve(),
      hasAccess: () => Promise.resolve(true),
      getLinkedAccounts: () =>
        Promise.resolve([
          {
            platform: Platform.TWITTER,
            userId: 'twitter-user-id',
            connectedAt: '2025-04-21T10:00:00.000Z', // Fixed timestamp for testing
          },
        ]),
      extractAndValidateNearAuth: () =>
        Promise.resolve({
          authData: {
            account_id: 'test.near',
            public_key: 'ed25519:mock-public-key',
            signature: 'mock-signature',
            message: 'mock-message',
            nonce: 'mock-nonce',
            recipient: 'crosspost.near',
          },
          signerId: 'test.near',
        }),
    };

    // Create mock env
    mockEnv = {} as Env;

    // Create the controller instance with mock dependencies
    authController = new AuthController(mockAuthService, mockNearAuthService, mockEnv);

    // Setup test app with routes
    app = setupTestApp((hono) => {
      hono.post('/near/authorize', (c) => authController.authorizeNear(c));
      hono.post('/near/unauthorize', (c) => authController.unauthorizeNear(c));
      hono.get('/near/status', (c) => authController.checkNearAuthorizationStatus(c));
      hono.get('/auth/:platform/initialize', ValidationMiddleware.validateQuery(AuthInitRequestSchema), (c) => authController.initializeAuth(c, c.req.param('platform') as Platform));
      hono.get('/auth/:platform/callback', ValidationMiddleware.validateQuery(AuthCallbackQuerySchema), (c) => authController.handleCallback(c, c.req.param('platform') as Platform));
      hono.post('/auth/:platform/refresh', ValidationMiddleware.validateBody(AuthTokenRequestSchema), (c) => authController.refreshToken(c, c.req.param('platform') as Platform));
      hono.post('/auth/:platform/revoke', ValidationMiddleware.validateBody(AuthTokenRequestSchema), (c) => authController.revokeToken(c, c.req.param('platform') as Platform));
      hono.get('/auth/:platform/valid', (c) => authController.hasValidTokens(c, c.req.param('platform') as Platform));
      hono.get('/auth/accounts', (c) => authController.listConnectedAccounts(c));
      hono.post('/auth/:platform/profile', ValidationMiddleware.validateBody(AuthTokenRequestSchema), (c) => authController.refreshUserProfile(c, c.req.param('platform') as Platform));
    });
  });

  describe('NEAR Authorization', () => {
    it('should authorize a NEAR account', async () => {
      // Create request
      const req = new Request('https://example.com/near/authorize', {
        method: 'POST',
      });

      // Make the request
      const response = await app.fetch(req);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertEquals(responseBody.success, true);
    });

    it('should handle errors when authorizing a NEAR account', async () => {
      mockNearAuthService.authorizeNearAccount = () =>
        Promise.resolve({ success: false, error: 'Authorization failed' });

      // Setup a new test app with the modified service
      const errorApp = setupTestApp((hono) => {
        // Remove the validation middleware for this test to focus on the controller error handling
        hono.post('/near/authorize', (c) => authController.authorizeNear(c));
      });

      // Create request with an empty body to avoid JSON parsing errors
      const req = new Request('https://example.com/near/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Empty but valid JSON
      });

      // Make the request
      const response = await errorApp.fetch(req);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 400);
      assertExists(responseBody.errors);
      assertEquals(responseBody.success, false);
      assertEquals(
        responseBody.errors[0].message,
        'Failed to authorize NEAR account: Authorization failed',
      );
      assertEquals(responseBody.errors[0].code, 'VALIDATION_ERROR');
    });

    it('should unauthorize a NEAR account', async () => {
      // Create request
      const req = new Request('https://example.com/near/unauthorize', {
        method: 'POST',
      });

      // Make the request
      const response = await app.fetch(req);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertEquals(responseBody.success, true);
    });

    it('should check NEAR account authorization status', async () => {
      // Create request
      const req = new Request('https://example.com/near/status');

      // Make the request
      const response = await app.fetch(req);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertEquals(responseBody.data.isAuthorized, true);
    });
  });

  describe('Platform Authentication', () => {
    it('should initialize authentication for a platform', async () => {
      // Create request with origin header
      const req = new Request('https://example.com/auth/twitter/initialize', {
        headers: {
          'Origin': 'https://test-origin.com',
        },
      });

      // Make the request
      const response = await app.fetch(req);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertExists(responseBody.data.url);
      assertEquals(responseBody.data.url, 'https://example.com/auth');
    });

    it('should handle auth callback from a platform (redirect flow)', async () => {
      // Mock handleCallback for redirect flow
      mockAuthService.handleCallback = () =>
        Promise.resolve({
          userId: 'twitter-user-id',
          successUrl: 'https://example.com/success',
          redirect: true, // Simulate redirect flow
          origin: 'https://test-origin.com',
        });

      // Setup a new test app with the modified service
      const redirectApp = setupTestApp((hono) => {
        hono.get('/auth/:platform/callback', ValidationMiddleware.validateQuery(AuthCallbackQuerySchema), (c) => authController.handleCallback(c, c.req.param('platform') as Platform));
      });

      // Create request with code and state parameters
      const req = new Request('https://example.com/auth/twitter/callback?code=auth-code&state=state-token');

      // Make the request
      const response = await redirectApp.fetch(req);

      // Verify the response is a redirect
      assertEquals(response.status, 302);
      const location = response.headers.get('Location');
      assertExists(location);
      assertEquals(location.startsWith('https://example.com/success'), true);
      assertEquals(location.includes('userId=twitter-user-id'), true);
      assertEquals(location.includes('platform=twitter'), true);
      assertEquals(location.includes('success=true'), true);
    });

    it('should handle errors in auth callback (state lookup fails)', async () => {
      // Override the getAuthState method to simulate state lookup failure
      mockAuthService.getPlatformAuth().getAuthState = () =>
        Promise.reject(new Error('State not found'));

      // Setup a new test app with the modified service
      const errorApp = setupTestApp((hono) => {
        hono.get('/auth/:platform/callback', (c) => authController.handleCallback(c, c.req.param('platform') as Platform));
      });

      // Create request with error parameters
      const req = new Request('https://example.com/auth/twitter/callback?error=access_denied&state=mock-state&error_description=User%20denied%20access');

      // Make the request
      const response = await errorApp.fetch(req);

      // For error cases where state lookup fails, we should get a JSON response via handleError
      assertEquals(response.status, 401); // Mapped from UNAUTHORIZED PlatformError

      // Parse the response body
      const responseBody = await response.json();
      assertExists(responseBody.errors);
      assertEquals(responseBody.success, false);
      assertEquals(responseBody.errors[0].code, ApiErrorCode.UNAUTHORIZED);
      assertEquals(responseBody.errors[0].message.includes('access_denied'), true);
    });

    it('should refresh a token', async () => {
      // Create request with userId in body
      const req = new Request('https://example.com/auth/twitter/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'twitter-user-id' }),
      });

      // Make the request
      const response = await app.fetch(req);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertEquals(responseBody.data.success, true);
    });

    it('should revoke a token', async () => {
      // Create request with userId in body
      const req = new Request('https://example.com/auth/twitter/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'twitter-user-id' }),
      });

      // Make the request
      const response = await app.fetch(req);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertEquals(responseBody.success, true);
    });

    it('should list connected accounts', async () => {
      // Create request
      const req = new Request('https://example.com/auth/accounts');

      // Make the request
      const response = await app.fetch(req);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertExists(responseBody.data.accounts);
      assertEquals(responseBody.data.accounts.length, 1);
      assertEquals(responseBody.data.accounts[0].platform, Platform.TWITTER);
      assertEquals(responseBody.data.accounts[0].connectedAt, '2025-04-21T10:00:00.000Z');
    });

    it('should refresh a user profile', async () => {
      // Create request with userId in body
      const req = new Request('https://example.com/auth/twitter/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'twitter-user-id' }),
      });

      // Make the request
      const response = await app.fetch(req);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertExists(responseBody.data.profile);
      assertEquals(responseBody.data.profile.id, 'twitter-user-id');
    });
  });

  describe('Error Handling', () => {
    it('should handle platform unavailable errors during token refresh', async () => {
      // Override the mock to simulate a platform unavailable error
      mockAuthService.refreshToken = () => {
        throw createPlatformError(
          ApiErrorCode.PLATFORM_UNAVAILABLE,
          'Platform unavailable',
          Platform.TWITTER,
          { userId: 'twitter-user-id' },
        );
      };

      // Setup a new test app with the modified service
      const errorApp = setupTestApp((hono) => {
        hono.post('/auth/:platform/refresh', ValidationMiddleware.validateBody(AuthTokenRequestSchema), (c) => authController.refreshToken(c, c.req.param('platform') as Platform));
      });

      // Create request with userId in body
      const req = new Request('https://example.com/auth/twitter/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'twitter-user-id' }),
      });

      // Make the request
      const response = await errorApp.fetch(req);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 503);
      assertExists(responseBody.errors);
      assertEquals(responseBody.success, false);
      assertEquals(responseBody.errors[0].code, ApiErrorCode.PLATFORM_UNAVAILABLE);
      assertEquals(responseBody.errors[0].details.platform, Platform.TWITTER);
      assertEquals(responseBody.errors[0].details.userId, 'twitter-user-id');
    });

    it('should handle unauthorized NEAR account', async () => {
      // Override the mock to simulate an unauthorized NEAR account
      mockNearAuthService.getNearAuthorizationStatus = () => Promise.resolve(-1); // Not authorized

      // Setup a new test app with the modified service
      const errorApp = setupTestApp((hono) => {
        hono.get('/auth/:platform/initialize', ValidationMiddleware.validateQuery(AuthInitRequestSchema), (c) => authController.initializeAuth(c, c.req.param('platform') as Platform));
      });

      // Create request
      const req = new Request('https://example.com/auth/twitter/initialize');

      // Make the request
      const response = await errorApp.fetch(req);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 403);
      assertExists(responseBody.errors);
      assertEquals(responseBody.success, false);
      assertEquals(responseBody.errors[0].code, 'FORBIDDEN');
    });

    it('should handle errors when refreshing user profile', async () => {
      // Override the mock to simulate an error
      mockAuthService.getUserProfile = () => Promise.resolve(null);

      // Setup a new test app with the modified service
      const errorApp = setupTestApp((hono) => {
        hono.post('/auth/:platform/profile', ValidationMiddleware.validateBody(AuthTokenRequestSchema), (c) => authController.refreshUserProfile(c, c.req.param('platform') as Platform));
      });

      // Create request with userId in body
      const req = new Request('https://example.com/auth/twitter/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'twitter-user-id' }),
      });

      // Make the request
      const response = await errorApp.fetch(req);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 404);
      assertExists(responseBody.errors);
      assertEquals(responseBody.success, false);
      assertEquals(responseBody.errors[0].code, 'NOT_FOUND');
    });
  });
});
