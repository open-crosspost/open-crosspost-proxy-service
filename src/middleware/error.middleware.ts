import {
  ApiError,
  ApiErrorCode,
  BaseError,
  createEnhancedErrorResponse,
  createErrorDetail,
  ErrorDetail,
  Platform,
  PlatformError,
} from '@crosspost/types';
import { Context, HTTPException, MiddlewareHandler, Next } from '../../deps.ts';
import type { StatusCode } from 'hono/utils/http-status';
import { getStatusCodeForError } from '../utils/error-handling.utils.ts';

/**
 * Error middleware for Hono
 * @returns Middleware handler
 */
export const errorMiddleware = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (err: unknown) {
      console.error('Error:', err);

      // Handle HTTPException from Hono
      if (err instanceof HTTPException) {
        c.status((err as HTTPException).status);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              (err as HTTPException).message,
              ApiErrorCode.UNKNOWN_ERROR,
              false,
              undefined,
              undefined,
            ),
          ]),
        );
      }

      // Handle our new ApiError
      if (err instanceof ApiError) {
        // Use the status from the error or get it from our map
        const statusCode = err.status || getStatusCodeForError(err.code);
        c.status(statusCode as StatusCode);

        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              err.message,
              err.code,
              err.recoverable,
              undefined,
              undefined,
              err.details,
            ),
          ]),
        );
      }

      // Handle our new PlatformError
      if (err instanceof PlatformError) {
        // Use the status from the error or get it from our map
        const statusCode = err.status || getStatusCodeForError(err.code);
        c.status(statusCode as StatusCode);

        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              err.message,
              err.code,
              err.recoverable,
              err.platform as Platform,
              err.userId,
              err.details,
            ),
          ]),
        );
      }

      // Handle arrays of errors (for multi-status responses)
      if (Array.isArray(err)) {
        if (err.length === 0) {
          c.status(500);
          return c.json(createEnhancedErrorResponse([
            createErrorDetail(
              'Empty error array received',
              ApiErrorCode.UNKNOWN_ERROR,
              false,
            ),
          ]));
        }

        // Convert errors to error details
        const errorDetails: ErrorDetail[] = err.map((e) => {
          if (e instanceof PlatformError) {
            return createErrorDetail(
              e.message,
              e.code,
              e.recoverable,
              e.platform as Platform,
              e.userId,
              e.details,
            );
          } else if (e instanceof ApiError) {
            return createErrorDetail(
              e.message,
              e.code,
              e.recoverable,
              undefined,
              undefined,
              e.details,
            );
          } else {
            return createErrorDetail(
              e instanceof Error ? e.message : String(e),
              ApiErrorCode.UNKNOWN_ERROR,
              false,
            );
          }
        });

        // Always use 207 Multi-Status for multiple errors
        c.status(207);
        return c.json(createEnhancedErrorResponse(errorDetails));
      }

      // Handle other BaseError types
      if (err instanceof BaseError) {
        c.status(500);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              err.message,
              ApiErrorCode.UNKNOWN_ERROR,
              false,
              undefined,
              undefined,
            ),
          ]),
        );
      }

      // Handle standard Error objects
      if (err instanceof Error) {
        c.status(500);
        return c.json(
          createEnhancedErrorResponse([
            createErrorDetail(
              err.message || 'An unexpected error occurred',
              ApiErrorCode.INTERNAL_ERROR,
              false,
              undefined,
              undefined,
            ),
          ]),
        );
      }

      // Handle unknown errors
      c.status(500);
      return c.json(
        createEnhancedErrorResponse([
          createErrorDetail(
            'An unexpected error occurred',
            ApiErrorCode.UNKNOWN_ERROR,
            false,
            undefined,
            undefined,
          ),
        ]),
      );
    }
  };
};
