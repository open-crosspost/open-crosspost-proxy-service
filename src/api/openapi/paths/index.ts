import { authPaths } from './auth.paths';
import { postPaths } from './post.paths';
import { mediaPaths } from './media.paths';
import { rateLimitPaths } from './rate-limit.paths';

/**
 * OpenAPI Paths
 * Combines all API paths into a single object
 */
export const paths = {
  ...authPaths,
  ...postPaths,
  ...mediaPaths,
  ...rateLimitPaths
};
