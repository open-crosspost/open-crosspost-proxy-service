import { Context, HTTPException, MiddlewareHandler, Next } from "../../deps.ts";

/**
 * Error types
 */
export enum ErrorType {
  VALIDATION = "validation_error",
  AUTHENTICATION = "authentication_error",
  AUTHORIZATION = "authorization_error",
  NOT_FOUND = "not_found",
  RATE_LIMIT = "rate_limit_error",
  PLATFORM_API = "platform_api_error",
  INTERNAL = "internal_error",
}

/**
 * API Error class
 */
export class ApiError extends Error {
  type: ErrorType;
  status: number;
  details?: unknown;

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL,
    status = 500,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.type = type;
    this.status = status;
    this.details = details;
  }

  /**
   * Create a validation error
   * @param message Error message
   * @param details Error details
   * @returns ApiError
   */
  static validation(message: string, details?: unknown): ApiError {
    return new ApiError(message, ErrorType.VALIDATION, 400, details);
  }

  /**
   * Create an authentication error
   * @param message Error message
   * @param details Error details
   * @returns ApiError
   */
  static authentication(message: string, details?: unknown): ApiError {
    return new ApiError(message, ErrorType.AUTHENTICATION, 401, details);
  }

  /**
   * Create an authorization error
   * @param message Error message
   * @param details Error details
   * @returns ApiError
   */
  static authorization(message: string, details?: unknown): ApiError {
    return new ApiError(message, ErrorType.AUTHORIZATION, 403, details);
  }

  /**
   * Create a not found error
   * @param message Error message
   * @param details Error details
   * @returns ApiError
   */
  static notFound(message: string, details?: unknown): ApiError {
    return new ApiError(message, ErrorType.NOT_FOUND, 404, details);
  }

  /**
   * Create a rate limit error
   * @param message Error message
   * @param details Error details
   * @returns ApiError
   */
  static rateLimit(message: string, details?: unknown): ApiError {
    return new ApiError(message, ErrorType.RATE_LIMIT, 429, details);
  }

  /**
   * Create a platform API error
   * @param message Error message
   * @param details Error details
   * @returns ApiError
   */
  static platformApi(message: string, details?: unknown): ApiError {
    return new ApiError(message, ErrorType.PLATFORM_API, 502, details);
  }

  /**
   * Create an internal error
   * @param message Error message
   * @param details Error details
   * @returns ApiError
   */
  static internal(message: string, details?: unknown): ApiError {
    return new ApiError(message, ErrorType.INTERNAL, 500, details);
  }
}

/**
 * Error middleware for Hono
 * @returns Middleware handler
 */
export const errorMiddleware = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (err: unknown) {
      console.error("Error:", err);

      // Handle HTTPException from Hono
      if (err instanceof HTTPException) {
        return c.json(
          {
            error: {
              type: "http_error",
              message: err.message,
              status: err.status,
            },
          },
          err.status
        );
      }

      // Handle ApiError
      if (err instanceof ApiError) {
        return c.json(
          {
            error: {
              type: err.type,
              message: err.message,
              status: err.status,
              details: err.details,
            },
            status: err.status
          },
        );
      }

      // Handle Error objects
      if (err instanceof Error) {
        return c.json(
          {
            error: {
              type: ErrorType.INTERNAL,
              message: err.message || "An unexpected error occurred",
              status: 500,
            },
          },
          500
        );
      }

      // Handle other errors
      return c.json(
        {
          error: {
            type: ErrorType.INTERNAL,
            message: "An unexpected error occurred",
            status: 500,
          },
        },
        500
      );
    }
  };
};
