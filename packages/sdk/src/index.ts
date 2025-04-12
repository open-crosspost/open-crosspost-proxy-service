/**
 * @crosspost/sdk
 * SDK for interacting with the Crosspost API
 */

// Export main client
export { CrosspostClient } from './core/client.ts';
export type { CrosspostClientConfig } from './core/config.ts';

// Export API modules for advanced usage
export { ActivityApi } from './api/activity.ts';
export { AuthApi } from './api/auth.ts';
export { PostApi } from './api/post.ts';
export { SystemApi } from './api/system.ts';

// Export utility functions
export { createNetworkError, handleErrorResponse } from './utils/error.ts';
export {
  apiWrapper,
  enrichErrorWithContext,
  ERROR_CATEGORIES,
  getErrorDetails,
  getErrorMessage,
  isAuthError,
  isContentError,
  isErrorOfCategory,
  isMediaError,
  isNetworkError,
  isPlatformError,
  isPostError,
  isRateLimitError,
  isRecoverableError,
  isValidationError,
} from './utils/error-utils.ts';
export {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
  clearAuthCookie,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  getAuthFromCookie,
  getCsrfToken,
  storeAuthInCookie,
} from './utils/cookie.ts';

// Re-export types from @crosspost/types for convenience
export * from '@crosspost/types';
