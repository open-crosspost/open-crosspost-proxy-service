import { authSchemas } from './auth.schemas.ts';
import { postSchemas } from './post.schemas.ts';
import { mediaSchemas } from './media.schemas.ts';
import { rateLimitSchemas } from './rate-limit.schemas.ts';
import { commonSchemas } from './common.schemas.ts';
import { leaderboardSchemas } from './leaderboard.schemas.ts';

/**
 * OpenAPI Schemas
 * Combines all API schemas into a single object
 */
export const schemas = {
  ...commonSchemas,
  ...authSchemas,
  ...postSchemas,
  ...mediaSchemas,
  ...rateLimitSchemas,
  ...leaderboardSchemas,
};
