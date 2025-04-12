/**
 * @crosspost/sdk
 * SDK for interacting with the Crosspost API
 */

// Export main client
export { CrosspostClient } from './core/client.js';
export { CrosspostClientConfig } from './core/config.js';

// Export API modules for advanced usage
export { AuthApi } from './api/auth.js';
export { PostApi } from './api/post.js';

// Export utility functions
export { createNetworkError, handleErrorResponse } from './utils/error.js';
export {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
  clearAuthCookie,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  getAuthFromCookie,
  getCsrfToken,
  storeAuthInCookie,
} from './utils/cookie.js';

// Re-export types from @crosspost/types for convenience
export * from '@crosspost/types';
