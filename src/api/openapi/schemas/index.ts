import { authSchemas } from './auth.schemas';
import { postSchemas } from './post.schemas';
import { mediaSchemas } from './media.schemas';
import { rateLimitSchemas } from './rate-limit.schemas';
import { commonSchemas } from './common.schemas';

/**
 * OpenAPI Schemas
 * Combines all API schemas into a single object
 */
export const schemas = {
  ...commonSchemas,
  ...authSchemas,
  ...postSchemas,
  ...mediaSchemas,
  ...rateLimitSchemas
};
