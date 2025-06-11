export { CrosspostClient } from './core/client.ts';
export type { CrosspostClientConfig } from './core/config.ts';

export { ActivityApi } from './api/activity.ts';
export { AuthApi } from './api/auth.ts';
export { PostApi } from './api/post.ts';
export { SystemApi } from './api/system.ts';

export {
  CrosspostError,
  getErrorDetails,
  getErrorMessage,
  isAuthError,
  isContentError,
  isMediaError,
  isNetworkError,
  isPlatformError,
  isPostError,
  isRateLimitError,
  isRecoverableError,
  isValidationError,
} from './utils/error.ts';
