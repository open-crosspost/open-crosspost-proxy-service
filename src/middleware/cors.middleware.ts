import { cors as honoCors, MiddlewareHandler } from '../../deps.ts';
import { getAllowedOrigins, isDevelopment, isProduction, isStaging } from '../config/env.ts';

export const corsMiddleware = (): MiddlewareHandler => {
  const allowedOriginsConfig = getAllowedOrigins();

  let corsOrigin: string | string[] | ((origin: string) => string | false | void) = '';

  if (allowedOriginsConfig === '*') {
    corsOrigin = '*';
  } else if (Array.isArray(allowedOriginsConfig) && allowedOriginsConfig.length > 0) {
    corsOrigin = allowedOriginsConfig;
  } else if (Array.isArray(allowedOriginsConfig) && allowedOriginsConfig.length === 0) {
    if (isDevelopment()) {
      console.warn(
        '[Security Warning] No ALLOWED_ORIGINS specified in development. Defaulting to allow all origins. This is not secure for production.',
      );
      corsOrigin = '*';
    } else if (isProduction() || isStaging()) {
      console.error(
        '[Security Error] No ALLOWED_ORIGINS specified in production/staging environment. Denying all origins.',
      );
      corsOrigin = (origin: string) => {
        return '';
      };
    }
  }

  return honoCors({
    origin: corsOrigin,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Near-Account'],
    exposeHeaders: [],
    maxAge: 600, // 10 minutes
    credentials: true,
  });
};
