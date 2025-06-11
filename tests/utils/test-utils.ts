import { PlatformName, PostResult } from '@crosspost/types';
import { Context } from '../../deps.ts';
import { ActivityTrackingService } from '../../src/domain/services/activity-tracking.service.ts';
import { AuthService } from '../../src/domain/services/auth.service.ts';
import { PostService } from '../../src/domain/services/post.service.ts';
import { RateLimitService } from '../../src/domain/services/rate-limit.service.ts';
import { nearAuthServiceMock } from '../mocks/near-auth-service-mock.ts';

/**
 * Generate mock auth token for testing
 * @param accountId Optional account ID (defaults to 'test.near')
 * @returns Mock auth token
 */
export function createMockAuthToken(accountId: string = 'test.near'): string {
  return JSON.stringify({
    account_id: accountId,
    public_key: 'ed25519:mock-public-key',
    signature: 'mock-signature',
    message: 'mock-message',
    nonce: new Uint8Array(32), // 32-byte nonce
    recipient: 'crosspost.near',
  });
}

/**
 * Create a mock context for testing
 * @param options Options for the mock context
 * @returns A mock context
 */
export function createMockContext(options: {
  signerId?: string;
  validatedBody?: unknown;
  validatedQuery?: Record<string, any>;
  params?: Record<string, string>;
  headers?: Record<string, string>;
} = {}): Context {
  // Create default Authorization header with NEAR signature if signerId is provided
  const defaultHeaders: Record<string, string> = {};
  if (options.signerId) {
    const authToken = JSON.stringify({
      account_id: options.signerId,
      public_key: 'ed25519:mock-public-key',
      signature: 'mock-signature',
      message: 'mock-message',
      nonce: 'mock-nonce',
      recipient: 'crosspost.near',
    });
    defaultHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  // Merge default headers with provided headers
  const mergedHeaders = { ...defaultHeaders, ...(options.headers || {}) };

  const c = {
    env: {},
    nearAuthService: nearAuthServiceMock,
    // Mock basic context properties
    req: {
      url: 'https://example.com',
      method: 'GET',
      headers: new Headers(mergedHeaders),
      header: (name: string) => {
        return mergedHeaders[name] || null;
      },
      query: (param: string) => {
        // Mock implementation for query parameters
        if (param === 'userId' && options.params?.userId) {
          return options.params.userId;
        }
        return null;
      },
      json: async () => {
        // Return the mock request body if _json is set, otherwise return validatedBody
        return (c.req as any)._json || options.validatedBody || {};
      },
    },
    // Mock context methods
    get: (key: string) => {
      if (key === 'signerId') return options.signerId || 'test.near';
      if (key === 'validatedBody') return options.validatedBody || {};
      if (key === 'validatedParams') return options.params || {};
      if (key === 'validatedQuery') return options.validatedQuery || {};
      if (key === 'platform' && options.params?.platform) return options.params.platform;
      return undefined;
    },
    set: (key: string, value: unknown) => {},
    status: (code: number) => {
      // Store the status code on the context
      (c as any)._status = code;
      return c;
    },
    json: (data: unknown) => {
      // Create a response with the stored status code
      return new Response(JSON.stringify(data), {
        status: (c as any)._status || 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    redirect: (url: string) => {
      // Create a redirect response
      return new Response(null, {
        status: 302,
        headers: { 'Location': url },
      });
    },
    // Add params if provided
    params: options.params || {},
  } as unknown as Context;

  return c;
}

/**
 * Create a test user ID
 * @param platform Platform name
 * @returns A test user ID for the platform
 */
export function createTestUserId(platform: PlatformName): string {
  return `test-user-${platform}`;
}

/**
 * Create mock services for testing
 * @param customMocks Optional custom mock implementations for services
 * @returns Mock services for testing
 */
export function createMockServices(customMocks: {
  postService?: Partial<PostService>;
  // Ensure the AuthService type here matches the structure including _spies if used
  authService?: Partial<
    AuthService & { _spies?: { unlinkAccount: { called: number; reset: () => void; fn: any } } }
  >;
  rateLimitService?: Partial<RateLimitService>;
  activityTrackingService?: Partial<ActivityTrackingService>;
} = {}) {
  // Default mock PostService implementation
  const defaultMockPostService = {
    createPost: (_platform: PlatformName, userId: string, content: any): Promise<PostResult> => {
      return Promise.resolve({
        id: `mock-post-id-${userId}`,
        url: `https://mock.platform/${userId}/posts/mock-post-id-${userId}`,
        text: Array.isArray(content) ? content[0].text : content.text,
        createdAt: new Date().toISOString(),
        success: true,
      } as PostResult);
    },
    // Add other PostService methods as needed, or ensure they are mocked if called
  };

  // Simple call counter for spy-like behavior for unlinkAccount
  const defaultUnlinkAccountSpy = {
    called: 0,
    reset: () => {
      defaultUnlinkAccountSpy.called = 0;
    },
    fn: async (_signerId: string, _platform: PlatformName, _userId: string): Promise<void> => {
      defaultUnlinkAccountSpy.called++;
      await Promise.resolve();
    },
  };

  // Default mock AuthService implementation
  const defaultMockAuthService = {
    // Properties from AuthService constructor
    nearAuthService: nearAuthServiceMock, // Use the imported mock or a simpler one
    authStateStore: {
      get: () => Promise.resolve(null),
      set: () => Promise.resolve(),
      delete: () => Promise.resolve(),
      list: () => Promise.resolve({ entries: [], cursor: '' }),
    } as any, // Mock PrefixedKvStore
    platformAuthMap: new Map(),
    platformProfileMap: new Map(),

    // Existing mocked methods
    hasAccess: (_signerId: string, _platform: PlatformName, _userId: string): Promise<boolean> =>
      Promise.resolve(true),
    getTokensForUser: (): Promise<{ accessToken: string }> =>
      Promise.resolve({ accessToken: 'mock-token' }), // This might need to align with AuthToken type
    unlinkAccount: defaultUnlinkAccountSpy.fn,
    _spies: {
      unlinkAccount: defaultUnlinkAccountSpy,
    },

    // Adding missing methods from AuthService with minimal mocks
    getPlatformAuth: (_platform: PlatformName) => {
      // Return a basic mock PlatformAuth or throw if not expected to be called
      return {
        initializeAuth: () =>
          Promise.resolve({
            authUrl: 'mockAuthUrl',
            state: 'mockState',
            codeVerifier: 'mockCodeVerifier',
          }),
        handleCallback: () =>
          Promise.resolve({
            userId: 'mockUserId',
            token: { accessToken: 'mockAccessToken', tokenType: 'bearer' } as any,
            successUrl: '/',
            redirect: true,
            origin: '/',
          }),
        refreshToken: () =>
          Promise.resolve({ accessToken: 'mockRefreshedToken', tokenType: 'bearer' } as any),
        revokeToken: () => Promise.resolve(true),
      } as any; // Cast to any to simplify mock structure if full PlatformAuth is complex
    },
    getPlatformProfile: (_platform: PlatformName) => {
      // Return a basic mock PlatformProfile or throw
      return {
        getUserProfile: () => Promise.resolve(null), // Or a mock UserProfile
      } as any; // Cast to any for simplicity
    },
    initializeAuth: () =>
      Promise.resolve({
        authUrl: 'mockAuthUrl',
        state: 'mockState',
        codeVerifier: 'mockCodeVerifier',
      }),
    handleCallback: () =>
      Promise.resolve({
        userId: 'mockUserId',
        token: { accessToken: 'mockAccessToken', tokenType: 'bearer' } as any,
        successUrl: '/',
        redirect: true,
        origin: '/',
      }),
    refreshToken: (_platform: PlatformName, _userId: string) =>
      Promise.resolve({ accessToken: 'mockRefreshedToken', tokenType: 'bearer' } as any),
    revokeToken: (_platform: PlatformName, _userId: string) => Promise.resolve(true),
    hasValidTokens: (_platform: PlatformName, _userId: string) => Promise.resolve(true),
    linkAccount: (_signerId: string, _platform: PlatformName, _userId: string) =>
      Promise.resolve(true),
    getUserProfile: (_platform: PlatformName, _userId: string, _forceRefresh?: boolean) =>
      Promise.resolve(null), // Or a mock UserProfile
  };

  // Default mock RateLimitService
  const defaultMockRateLimitService = {
    canPerformAction: (_platform: PlatformName, _action?: string): Promise<boolean> =>
      Promise.resolve(true),
  };

  // Default mock ActivityTrackingService
  const defaultMockActivityTrackingService = {
    trackPost: (
      _signerId: string,
      _platform: PlatformName,
      _userId: string,
      _postId: string,
    ): Promise<void> => Promise.resolve(),
  };

  // Merge defaults with custom mocks
  const finalPostService = { ...defaultMockPostService, ...customMocks.postService };
  const finalAuthService = { ...defaultMockAuthService, ...customMocks.authService };

  const finalRateLimitService = { ...defaultMockRateLimitService, ...customMocks.rateLimitService };
  const finalActivityTrackingService = {
    ...defaultMockActivityTrackingService,
    ...customMocks.activityTrackingService,
  };

  return {
    postService: finalPostService as PostService,
    authService: finalAuthService as any as AuthService & {
      _spies: { unlinkAccount: typeof defaultUnlinkAccountSpy };
    },
    rateLimitService: finalRateLimitService as RateLimitService,
    activityTrackingService: finalActivityTrackingService as ActivityTrackingService,
  };
}

/**
 * Create mock services for rate limit error testing
 * @returns Mock services with rate limit error
 */
export function createRateLimitErrorServices() {
  const services = createMockServices();
  return {
    ...services,
    rateLimitService: {
      canPerformAction: () => Promise.resolve(false),
    } as unknown as RateLimitService,
  };
}

/**
 * Create mock services for authentication error testing
 * @returns Mock services with authentication error
 */
export function createAuthErrorServices() {
  const services = createMockServices();
  return {
    ...services,
    authService: {
      hasAccess: () => Promise.resolve(false),
      getTokensForUser: () => Promise.resolve({ accessToken: 'mock-token' }),
    } as unknown as AuthService,
  };
}

/**
 * Create mock services for platform error testing
 * @param error The platform error to throw
 * @returns Mock services with platform error
 */
export function createPlatformErrorServices(error: Error) {
  const services = createMockServices();
  return {
    ...services,
    postService: {
      createPost: () => Promise.reject(error),
    } as unknown as PostService,
  };
}
