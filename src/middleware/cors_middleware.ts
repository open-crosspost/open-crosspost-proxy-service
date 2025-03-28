import { cors as honoCors, MiddlewareHandler } from "../deps.ts";
import { getAllowedOrigins } from "../config/env.ts";

/**
 * CORS middleware for Hono
 * @returns Middleware handler
 */
export const corsMiddleware = (): MiddlewareHandler => {
  const allowedOrigins = getAllowedOrigins();

  console.log("allowed origins", allowedOrigins);

  return honoCors({
    origin: (origin) => {
      console.log("CORS middleware checking origin:", origin);
      
      // If no allowed origins are configured, allow all origins
      if (allowedOrigins.length === 0) {
        console.log("No allowed origins configured, allowing all origins");
        return "*";
      }

      // If the origin is in the allowed origins list, allow it
      if (origin && allowedOrigins.includes(origin)) {
        console.log("Origin is allowed:", origin);
        return origin;
      }

      // Otherwise, deny the request
      console.log("Origin is not allowed:", origin);
      console.log("Allowed origins:", allowedOrigins);
      return "";
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["X-Rate-Limit-Limit", "X-Rate-Limit-Remaining", "X-Rate-Limit-Reset"],
    maxAge: 600, // 10 minutes
    credentials: true,
  });
};
