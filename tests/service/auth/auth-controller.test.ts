import { ApiErrorCode, Platform } from '@crosspost/types';
import { assertEquals, assertExists } from 'jsr:@std/assert';
import { beforeEach, describe, it } from 'jsr:@std/testing/bdd';
import { Env } from '../../../src/config/env.ts';
import { AuthController } from '../../../src/controllers/auth.controller.ts';
import { createPlatformError } from '../../../src/errors/platform-error.ts';
import { createMockContext } from '../../utils/test-utils.ts';

describe('Auth Controller', () => {
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
      unlinkAccount: () => Promise.resolve(),
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
  });

  describe('NEAR Authorization', () => {
    it('should authorize a NEAR account', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
      });

      // Call the controller
      const response = await authController.authorizeNear(context);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertEquals(responseBody.success, true);
    });

    it('should handle errors when authorizing a NEAR account', async () => {
      // Override the mock to simulate an error
      mockNearAuthService.authorizeNearAccount = () =>
        Promise.resolve({ success: false, error: 'Authorization failed' });

      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
      });

      // Call the controller
      const response = await authController.authorizeNear(context);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 500);
      assertExists(responseBody.errors);
      assertEquals(responseBody.success, false);
      assertEquals(
        responseBody.errors[0].message,
        'Failed to authorize NEAR account: Authorization failed',
      );
      assertEquals(responseBody.errors[0].code, 'INTERNAL_ERROR');
    });

    it('should unauthorize a NEAR account', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
      });

      // Call the controller
      const response = await authController.unauthorizeNear(context);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertEquals(responseBody.success, true);
    });

    it('should check NEAR account authorization status', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
      });

      // Call the controller
      const response = await authController.checkNearAuthorizationStatus(context);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertEquals(responseBody.data.isAuthorized, true);
    });
  });

  describe('Platform Authentication', () => {
    it('should initialize authentication for a platform', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
        headers: {
          origin: 'https://test-origin.com',
        },
      });

      // Call the controller
      const response = await authController.initializeAuth(context, Platform.TWITTER);
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

      // Create a mock context with URL that includes code and state
      const context = createMockContext({
        params: {
          platform: Platform.TWITTER,
        },
      });

      // Mock the URL to include code and state
      (context.req as any).url =
        'https://example.com/auth/twitter/callback?code=auth-code&state=state-token';

      // Call the controller
      const response = await authController.handleCallback(context, Platform.TWITTER);

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
      // Create a mock context with URL that includes an error
      const context = createMockContext({
        params: {
          platform: Platform.TWITTER,
        },
      });

      // Mock the URL to include an error and state
      (context.req as any).url =
        'https://example.com/auth/twitter/callback?error=access_denied&state=mock-state&error_description=User%20denied%20access';

      // Override the getAuthState method to simulate state lookup failure
      mockAuthService.getPlatformAuth().getAuthState = () =>
        Promise.reject(new Error('State not found'));

      // Call the controller
      const response = await authController.handleCallback(context, Platform.TWITTER);

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
      // Create a mock context with validated body
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
        validatedBody: { userId: 'twitter-user-id' },
      });

      // Call the controller
      const response = await authController.refreshToken(context, Platform.TWITTER);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertEquals(responseBody.data.success, true);
    });

    it('should revoke a token', async () => {
      // Create a mock context with validated body
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
        validatedBody: { userId: 'twitter-user-id' },
      });

      // Call the controller
      const response = await authController.revokeToken(context, Platform.TWITTER);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertEquals(responseBody.success, true);
      assertEquals(responseBody.data.tokenRevoked, true);
    });

    it('should handle token revocation failure gracefully', async () => {
      // Override the mock to simulate token revocation failure
      mockAuthService.revokeToken = () => {
        throw new Error('Failed to revoke token');
      };

      // Create a mock context with validated body
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
        validatedBody: { userId: 'twitter-user-id' },
      });

      // Call the controller
      const response = await authController.revokeToken(context, Platform.TWITTER);
      const responseBody = await response.json();

      // Verify the response - should still be 200 since unlinking succeeded
      assertEquals(response.status, 200);
      assertEquals(responseBody.success, true);
      assertEquals(responseBody.data.tokenRevoked, false);
    });

    it('should fail if unlinking fails', async () => {
      // Override the mock to simulate unlinking failure
      mockAuthService.unlinkAccount = () => {
        throw new Error('Failed to unlink account');
      };

      // Create a mock context with validated body
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
        validatedBody: { userId: 'twitter-user-id' },
      });

      // Call the controller
      const response = await authController.revokeToken(context, Platform.TWITTER);
      const responseBody = await response.json();

      // Verify the response - should be 500 since unlinking failed
      assertEquals(response.status, 500);
      assertEquals(responseBody.success, false);
      assertExists(responseBody.errors);
      assertEquals(responseBody.errors[0].message, 'Failed to unlink account');
    });

    it('should check if a user has valid tokens', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
      });

      // Mock the query method to return userId
      (context.req as any).query = (param: string) => param === 'userId' ? 'twitter-user-id' : null;

      // Call the controller
      const response = await authController.hasValidTokens(context, Platform.TWITTER);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 200);
      assertExists(responseBody.data);
      assertEquals(responseBody.data.hasTokens, true);
      assertEquals(responseBody.data.isLinked, true);
    });

    it('should list connected accounts', async () => {
      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
      });

      // Call the controller
      const response = await authController.listConnectedAccounts(context);
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
      // Create a mock context with validated body
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
        validatedBody: { userId: 'twitter-user-id' },
      });

      // Call the controller
      const response = await authController.refreshUserProfile(context, Platform.TWITTER);
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

      // Create a mock context with validated body
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
        validatedBody: { userId: 'twitter-user-id' },
      });

      // Call the controller
      const response = await authController.refreshToken(context, Platform.TWITTER);
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

      // Create a mock context
      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
      });

      // Call the controller
      const response = await authController.initializeAuth(context, Platform.TWITTER);
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

      const context = createMockContext({
        signerId: 'test.near',
        params: {
          platform: Platform.TWITTER,
        },
        validatedBody: { userId: 'twitter-user-id' },
      });

      // Call the controller
      const response = await authController.refreshUserProfile(context, Platform.TWITTER);
      const responseBody = await response.json();

      // Verify the response
      assertEquals(response.status, 404);
      assertExists(responseBody.errors);
      assertEquals(responseBody.success, false);
      assertEquals(responseBody.errors[0].code, 'NOT_FOUND');
    });
  });
});
