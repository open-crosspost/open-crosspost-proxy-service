import { Env } from '../config/env.ts';
import { CsrfMiddleware } from './csrf.middleware.ts';

/**
 * Initialize CSRF middleware with the application's encryption key
 * @param env Environment configuration
 * @returns CSRF middleware handlers
 */
export function initializeCsrfMiddleware(env: Env) {
  // Use the encryption key as the CSRF secret
  const csrfSecret = env.ENCRYPTION_KEY;

  // Create middleware handlers
  return CsrfMiddleware.create(csrfSecret);
}
