import { ApiErrorCode, errorCodeToStatusCode } from '@crosspost/types';
import { Context, Next, z } from '../../deps.ts';
import { createErrorDetail, createErrorResponse } from '../utils/response.utils.ts';

export class ValidationMiddleware {
  /**
   * Validate request body against a Zod schema
   * @param schema Zod schema to validate against
   * @returns Middleware function
   */
  static validateBody(schema: z.ZodType) {
    return async (c: Context, next: Next) => {
      const body = await c.req.json();
      const result = schema.safeParse(body);

      if (!result.success) {
        c.status(errorCodeToStatusCode[ApiErrorCode.VALIDATION_ERROR]);
        return c.json(
          createErrorResponse(c, [
            createErrorDetail(
              'Validation Error: Invalid request body.',
              ApiErrorCode.VALIDATION_ERROR,
              false,
              { validationErrors: result.error.errors },
            ),
          ]),
        );
      }

      // Store validated data in context
      c.set('validatedBody', result.data);
      await next();
    };
  }

  /**
   * Validate request params against a Zod schema
   * @param schema Zod schema to validate against
   * @returns Middleware function
   */
  static validateParams(schema: z.ZodType) {
    return async (c: Context, next: Next) => {
      const params = c.req.param();
      const result = schema.safeParse(params);

      if (!result.success) {
        c.status(errorCodeToStatusCode[ApiErrorCode.VALIDATION_ERROR]);
        return c.json(
          createErrorResponse(c, [
            createErrorDetail(
              'Validation Error: Invalid request parameters.',
              ApiErrorCode.VALIDATION_ERROR,
              false,
              { validationErrors: result.error.errors },
            ),
          ]),
        );
      }

      // Store validated data in context
      c.set('validatedParams', result.data);
      await next();
    };
  }

  /**
   * Validate request query against a Zod schema
   * @param schema Zod schema to validate against
   * @returns Middleware function
   */
  static validateQuery(schema: z.ZodType) {
    return async (c: Context, next: Next) => {
      const query = c.req.query();
      const result = schema.safeParse(query);

      if (!result.success) {
        c.status(errorCodeToStatusCode[ApiErrorCode.VALIDATION_ERROR]);
        return c.json(
          createErrorResponse(c, [
            createErrorDetail(
              'Validation Error: Invalid request query.',
              ApiErrorCode.VALIDATION_ERROR,
              false,
              { validationErrors: result.error.errors },
            ),
          ]),
        );
      }

      // Store validated data in context
      c.set('validatedQuery', result.data);
      await next();
    };
  }
}
