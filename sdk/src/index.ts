/**
 * Crosspost SDK
 * A TypeScript SDK for interacting with the Crosspost API
 */

// Export the client
export { CrosspostApiClient } from './client.ts';

// Export configuration
export { OPEN_CROSSPOST_PROXY_API, SupportedPlatform } from './config.ts';

// Export authentication utilities
export { getCurrentAuthData } from './auth.ts';
export type { NearAuthData } from './auth.ts';

// Export types
export * from './types/index.ts';

// Create and export a singleton instance of the API client
import { CrosspostApiClient } from './client.ts';
export const apiClient = new CrosspostApiClient();
