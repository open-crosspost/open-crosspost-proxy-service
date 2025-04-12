import { ApiError, ApiErrorCode } from '@crosspost/types';
import { Context, MiddlewareHandler, Next } from '../../deps.ts';
import {
  deleteCookie,
  getCookie,
  getSignedCookie,
  setCookie,
  setSignedCookie,
} from 'npm:hono/cookie';

const AUTH_COOKIE_NAME = '__crosspost_auth';
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * CSRF protection middleware for Hono
 * Implements the Double Submit Cookie pattern with signed cookies
 */
export class CsrfMiddleware {
  private csrfSecret: string;

  /**
   * Creates a new instance of CsrfMiddleware
   * @param csrfSecret Secret used for signing CSRF cookies
   */
  constructor(csrfSecret: string) {
    this.csrfSecret = csrfSecret;
  }

  /**
   * Generates a CSRF token and sets it in a signed cookie
   * @returns Middleware handler
   */
  generateToken(): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      // Generate a random token
      const token = crypto.randomUUID();

      // Set the token in a signed cookie
      await setSignedCookie(c, CSRF_COOKIE_NAME, token, this.csrfSecret, {
        httpOnly: false, // Must be accessible from JavaScript
        secure: true,
        sameSite: 'Lax', // Restrict to same-site and top-level navigation
        path: '/',
      });

      await next();
    };
  }

  /**
   * Validates the CSRF token for state-changing requests (non-GET/HEAD)
   * @returns Middleware handler
   */
  validateToken(): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      const method = c.req.method.toUpperCase();

      // Skip validation for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        await next();
        return;
      }

      // Get the token from the signed cookie
      const cookieToken = await getSignedCookie(c, this.csrfSecret, CSRF_COOKIE_NAME);

      // Get the token from the header
      const headerToken = c.req.header(CSRF_HEADER_NAME);

      // Validate the tokens
      if (cookieToken === false) {
        // Cookie signature validation failed
        throw new ApiError(
          'CSRF token validation failed',
          ApiErrorCode.FORBIDDEN,
          403,
          { reason: 'Invalid CSRF token signature' },
        );
      }

      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        throw new ApiError(
          'CSRF token validation failed',
          ApiErrorCode.FORBIDDEN,
          403,
          { reason: 'Invalid or missing CSRF token' },
        );
      }

      await next();
    };
  }

  /**
   * Creates middleware handlers with default configuration
   * @param csrfSecret Secret used for signing CSRF cookies
   * @returns Object with generateToken and validateToken middleware handlers
   */
  static create(csrfSecret: string) {
    const middleware = new CsrfMiddleware(csrfSecret);
    return {
      generateToken: middleware.generateToken(),
      validateToken: middleware.validateToken(),
    };
  }
}

// Export constants for use in other files
export const CSRF_CONSTANTS = {
  COOKIE_NAME: CSRF_COOKIE_NAME,
  HEADER_NAME: CSRF_HEADER_NAME,
};
