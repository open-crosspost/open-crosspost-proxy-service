import { cors as honoCors, MiddlewareHandler } from '../../deps.ts';
import { getAllowedOrigins } from '../config/env.ts';

export const corsMiddleware = (): MiddlewareHandler => {
  const allowedOrigins = getAllowedOrigins();

  return honoCors({
    origin: (origin) => {
      // If no allowed origins are configured, allow all origins
      if (allowedOrigins.length === 0) {
        return '*';
      }

      // If the origin is in the allowed origins list, allow it
      if (origin && allowedOrigins.includes(origin)) {
        return origin;
      }

      // Otherwise, deny the request
      return '';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Near-Account'],
    exposeHeaders: [],
    maxAge: 600, // 10 minutes
    credentials: true,
  });
};
