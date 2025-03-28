import { Context, MiddlewareHandler, Next } from "../deps.ts";
import { getApiKeys } from "../config/env.ts";
import { ApiError } from "./error_middleware.ts";

/**
 * Authentication middleware for Hono
 * Validates API keys and extracts user IDs
 */
export class AuthMiddleware {
  /**
   * Validate API key middleware
   * @returns Middleware handler
   */
  static validateApiKey(): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      try {
        const apiKey = c.req.header("X-API-Key");
        
        if (!apiKey) {
          throw ApiError.authentication("API key is required");
        }
        
        const apiKeys = getApiKeys();
        
        if (!apiKeys.has(apiKey)) {
          throw ApiError.authentication("Invalid API key");
        }
        
        // Check origin if available
        const origin = c.req.header("Origin");
        if (origin) {
          const allowedOrigins = apiKeys.get(apiKey) || [];
          
          if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
            throw ApiError.authentication("API key not valid for this origin");
          }
        }
        
        // Store API key in context for later use
        c.set("apiKey", apiKey);
        
        await next();
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw ApiError.authentication("Authentication failed");
      }
    };
  }
  
  /**
   * Extract user ID middleware
   * @returns Middleware handler
   */
  static extractUserId(): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      try {
        const userId = c.req.header("X-User-ID");
        
        if (!userId) {
          throw ApiError.authentication("User ID is required");
        }
        
        // Store user ID in context for later use
        c.set("userId", userId);
        
        await next();
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw ApiError.authentication("Failed to extract user ID");
      }
    };
  }
}
