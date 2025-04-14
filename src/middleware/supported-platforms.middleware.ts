import {
  ApiError,
  ApiErrorCode,
  isPlatformSupported,
  PlatformName,
  SupportedPlatformName,
} from '@crosspost/types';
import { Context, Next } from '../../deps.ts';
export class PlatformMiddleware {
  /**
   * Validate that the platform parameter is supported
   * @returns Middleware function
   */
  static validatePlatform() {
    return async (c: Context, next: Next) => {
      const platform = c.req.param('platform');

      if (!platform) {
        throw new ApiError(
          'Platform parameter is required',
          ApiErrorCode.VALIDATION_ERROR,
          400,
        );
      }

      if (!isPlatformSupported(platform as PlatformName)) {
        throw new ApiError(
          `Unsupported platform: ${platform}`,
          ApiErrorCode.VALIDATION_ERROR,
          400,
          { platform },
        );
      }

      // Add the validated platform to the context variables
      c.set('platform', platform as SupportedPlatformName);

      // Continue to the next middleware or route handler
      await next();
    };
  }

  /**
   * Get the validated platform from the context
   * @param c The Hono context
   * @returns The validated platform
   */
  static getPlatform(c: Context): SupportedPlatformName {
    return c.get('platform');
  }
}
