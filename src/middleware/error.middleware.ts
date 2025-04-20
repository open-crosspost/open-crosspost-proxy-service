import { ApiErrorCode, type ErrorDetail, type StatusCode } from '@crosspost/types';
import { Context, HTTPException, MiddlewareHandler, Next } from '../../deps.ts';
import { createErrorDetail, createErrorResponse } from '../utils/response.utils.ts';
import { ApiError } from '../errors/api-error.ts';
import { PlatformError } from '../errors/platform-error.ts';

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
          createErrorResponse([
            createErrorDetail(
              (err as HTTPException).message,
              ApiErrorCode.UNKNOWN_ERROR,
              false,
              { originalError: err },
            ),
          ]),
        );
      }

      if (err instanceof ApiError) {
        c.status(err.status);

        // For PlatformError, ensure platform is in details
        const details = err instanceof PlatformError
          ? { platform: err.platform, ...err.details }
          : err.details;

        return c.json(
          createErrorResponse([
            createErrorDetail(
              err.message,
              err.code,
              err.recoverable,
              details,
            ),
          ]),
        );
      }

      // Handle arrays of errors (e.g., from multi-platform operations)
      if (Array.isArray(err)) {
        if (err.length === 0) {
          c.status(500);
          return c.json(createErrorResponse([
            createErrorDetail(
              'Empty error array received',
              ApiErrorCode.INTERNAL_ERROR,
              false,
            ),
          ]));
        }

        // Convert all errors in the array to ErrorDetail
        const errorDetails: ErrorDetail[] = err.map((e) => {
          if (e instanceof ApiError) {
            const details = e instanceof PlatformError
              ? { platform: e.platform, ...e.details }
              : e.details;
            return createErrorDetail(
              e.message,
              e.code,
              e.recoverable,
              details,
            );
          } else {
            // Handle non-ApiError items in the array
            return createErrorDetail(
              e instanceof Error ? e.message : String(e),
              ApiErrorCode.UNKNOWN_ERROR,
              false,
              { originalError: e },
            );
          }
        });

        // Determine overall status (usually 207 Multi-Status)
        // Could be 4xx/5xx if all errors have the same status
        const allSameStatus = err.every((e) =>
          e instanceof ApiError && e.status === (err[0] as ApiError).status
        );
        const status = allSameStatus && err[0] instanceof ApiError ? err[0].status : 207;
        c.status(status);

        return c.json(createErrorResponse(errorDetails));
      }

      // Handle standard Error objects
      if (err instanceof Error) {
        console.error('Caught standard Error:', err.message, err.stack);
        c.status(500);
        return c.json(
          createErrorResponse([
            createErrorDetail(
              'An internal server error occurred.',
              ApiErrorCode.INTERNAL_ERROR,
              false,
              { errorName: err.name },
            ),
          ]),
        );
      }

      // Handle unknown errors (non-Error types thrown)
      console.error('Caught unknown error type:', err);
      c.status(500);
      return c.json(
        createErrorResponse([
          createErrorDetail(
            'An unexpected internal error occurred.',
            ApiErrorCode.UNKNOWN_ERROR,
            false,
            { errorType: typeof err },
          ),
        ]),
      );
    }
  };
};
