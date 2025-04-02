/**
 * @crosspost/sdk
 * SDK for interacting with the Crosspost API
 */

// Export the main client
export { CrosspostClient } from './core/client.js';

// Export auth providers
export * from './auth/index.js';

// Export platform-specific clients
export * from './platforms/index.js';

// Export error types
export * from './errors/index.js';

// Re-export types from @crosspost/types
export * from '@crosspost/types';
