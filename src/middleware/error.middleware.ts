import { ApiErrorCode, errorCodeToStatusCode, type ErrorDetail, type ErrorDetails } from '@crosspost/types';
import { Context, HTTPException, MiddlewareHandler, Next } from '../../deps.ts';
import { ApiError } from '../errors/api-error.ts';
import { PlatformError } from '../errors/platform-error.ts';
import { createErrorDetail, createErrorResponse } from '../utils/response.utils.ts';

export const errorMiddleware = (): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    try {
      await next();
    } catch (err: unknown) {
      console.error('Error:', err);

      // Handle HTTPException from Hono
      if (err instanceof HTTPException) {
        // Map HTTP status to an appropriate ApiErrorCode
        let code = ApiErrorCode.UNKNOWN_ERROR;
        switch (err.status) {
          case 400:
            code = ApiErrorCode.VALIDATION_ERROR;
            break;
          case 401:
            code = ApiErrorCode.UNAUTHORIZED;
            break;
          case 403:
            code = ApiErrorCode.FORBIDDEN;
            break;
          case 404:
            code = ApiErrorCode.NOT_FOUND;
            break;
          case 429:
            code = ApiErrorCode.RATE_LIMITED;
            break;
          case 500:
            code = ApiErrorCode.INTERNAL_ERROR;
            break;
          default:
            code = ApiErrorCode.UNKNOWN_ERROR;
        }

        // Set status and headers before creating response
        c.status(err.status);
        c.header('Content-Type', 'application/json');

        // Extract context information
        const requestPlatform = c.get('platform');
        const requestUserId = c.get('userId');
        const requestSignerId = c.get('signerId');

        // Create details with context and error information
        const details: ErrorDetails = {
          ...(requestPlatform && { platform: requestPlatform }),
          ...(requestUserId && { userId: requestUserId }),
          ...(requestSignerId && { signerId: requestSignerId }),
        };

        const response = createErrorResponse(c, [
          createErrorDetail(
            err.message || 'Not Found',
            code,
            false,
            details,
          ),
        ]);

        return c.json(response);
      }

      if (err instanceof ApiError) {
        // Use the status code from the error
        c.status(err.status);
        c.header('Content-Type', 'application/json');

        // Extract context information
        const requestPlatform = c.get('platform');
        const requestUserId = c.get('userId');
        const requestSignerId = c.get('signerId');

        // Base details from the error itself
        let baseDetails: ErrorDetails = err.details || {};
        
        // For PlatformError, ensure platform is in details
        if (err instanceof PlatformError) {
          baseDetails = { platform: err.platform, ...baseDetails };
        }

        // Merge request context into details (avoid overwriting existing details)
        const contextDetails: ErrorDetails = {
          ...(requestPlatform && { platform: requestPlatform }),
          ...(requestUserId && { userId: requestUserId }),
          ...(requestSignerId && { signerId: requestSignerId }),
        };

        // Final details with context added (original details take precedence)
        const finalDetails = {
          ...contextDetails,
          ...baseDetails, // Original details take precedence
        };

        return c.json(
          createErrorResponse(c, [
            createErrorDetail(
              err.message,
              err.code,
              err.recoverable,
              Object.keys(finalDetails).length > 0 ? finalDetails : undefined,
            ),
          ]),
        );
      }

      // Handle arrays of errors (e.g., from multi-platform operations)
      if (Array.isArray(err)) {
        if (err.length === 0) {
          const status = errorCodeToStatusCode[ApiErrorCode.INTERNAL_ERROR];
          c.status(status);
          c.header('Content-Type', 'application/json');
          return c.json(createErrorResponse(c, [
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
        const status = allSameStatus && err[0] instanceof ApiError 
          ? errorCodeToStatusCode[err[0].code] 
          : 207;
        c.status(status);
        c.header('Content-Type', 'application/json');
        return c.json(createErrorResponse(c, errorDetails));
      }

      // Handle standard Error objects
      if (err instanceof Error) {
        const status = errorCodeToStatusCode[ApiErrorCode.INTERNAL_ERROR];
        c.status(status);
        c.header('Content-Type', 'application/json');
        
        // Extract context information
        const requestPlatform = c.get('platform');
        const requestUserId = c.get('userId');
        const requestSignerId = c.get('signerId');

        // Create details with context and error information
        const details: ErrorDetails = {
          errorName: err.name,
          errorStack: err.stack,
          ...(requestPlatform && { platform: requestPlatform }),
          ...(requestUserId && { userId: requestUserId }),
          ...(requestSignerId && { signerId: requestSignerId }),
        };

        const response = createErrorResponse(c, [
          createErrorDetail(
            err.message || 'An internal server error occurred.',
            ApiErrorCode.INTERNAL_ERROR,
            false,
            details,
          ),
        ]);
        return c.json(response);
      }


      // Handle unknown errors (non-Error types thrown)
      console.error('Caught unknown error type:', err);
      const status = errorCodeToStatusCode[ApiErrorCode.UNKNOWN_ERROR];
      c.status(status);
      c.header('Content-Type', 'application/json');
      
      // Extract context information
      const requestPlatform = c.get('platform');
      const requestUserId = c.get('userId');
      const requestSignerId = c.get('signerId');

      // Create details with context and error information
      const details: ErrorDetails = {
        errorType: typeof err,
        ...(requestPlatform && { platform: requestPlatform }),
        ...(requestUserId && { userId: requestUserId }),
        ...(requestSignerId && { signerId: requestSignerId }),
      };

      const response = createErrorResponse(c, [
        createErrorDetail(
          'An unexpected internal error occurred.',
          ApiErrorCode.UNKNOWN_ERROR,
          false,
          details,
        ),
      ]);
      return c.json(response);
    }
  };
};
