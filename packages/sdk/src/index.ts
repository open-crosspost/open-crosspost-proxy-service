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
export { handleErrorResponse, createNetworkError } from './utils/error.js';

// Re-export types from @crosspost/types for convenience
export * from '@crosspost/types';
