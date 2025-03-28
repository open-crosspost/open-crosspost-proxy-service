import { getEnv } from "../config/env.ts";
import { Context, MiddlewareHandler, Next } from "../deps.ts";
import { NearAuthService } from "../infrastructure/security/near-auth/near-auth.service.ts";
import { NearAuthData } from "../infrastructure/security/near-auth/near-auth.types.ts";
import { ApiError } from "./error_middleware.ts";

/**
 * Authentication middleware for Hono
 * Validates API keys and extracts user IDs
 */
export class AuthMiddleware {
  /**
   * Validate NEAR signature middleware
   * @returns Middleware handler
   */
  static validateNearSignature(): MiddlewareHandler {
    return async (c: Context, next: Next) => {
      try {
        // Extract NEAR auth data from headers
        const authHeader = c.req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw ApiError.authentication("Missing or invalid Authorization header");
        }

        // Extract the token part (after 'Bearer ')
        const token = authHeader.substring(7);

        // Parse the JSON token
        let authObject: NearAuthData;
        try {
          authObject = JSON.parse(token);
        } catch (error) {
          return c.json({
            error: {
              type: "validation_error",
              message: "Invalid JSON in Authorization token",
              status: 400
            }
          }, 400);
        }

        // Check if all required fields are present
        if (!authObject.account_id || !authObject.public_key || !authObject.signature ||
          !authObject.message || !authObject.nonce) {
          console.log("authObject", authObject);
          return c.json({
            error: {
              type: "validation_error",
              message: "Missing required NEAR authentication data in token",
              status: 400
            }
          }, 400);
        }

        // Set default values if not provided
        const authData: NearAuthData = {
          ...authObject,
          recipient: authObject.recipient || 'crosspost.near', // Default recipient
          callback_url: authObject.callback_url || c.req.url // Use current URL as callback if not provided
        };

        // Initialize NEAR auth service
        const env = getEnv();
        const nearAuthService = new NearAuthService(env);

        // Validate signature
        const result = await nearAuthService.validateNearAuth(authData);

        if (!result.valid) {
          throw ApiError.authentication(`NEAR authentication failed: ${result.error}`);
        }

        // Store NEAR account ID in context for later use
        c.set("nearAccountId", result.accountId);

        console.log("near auth validated");

        await next();
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw ApiError.authentication("NEAR authentication failed");
      }
    };
  }
}
