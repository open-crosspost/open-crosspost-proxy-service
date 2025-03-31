import { authPaths } from './auth.paths.ts';
import { postPaths } from './post.paths.ts';
import { mediaPaths } from './media.paths.ts';
import { rateLimitPaths } from './rate-limit.paths.ts';

/**
 * OpenAPI Paths
 * Combines all API paths into a single object
 */
export const paths = {
  ...authPaths,
  ...postPaths,
  ...mediaPaths,
  ...rateLimitPaths,
};
