import { z } from 'zod';
import { type ErrorDetail, ErrorDetailSchema } from './errors.ts';

export const ResponseMetaSchema = z.object({
  requestId: z.string().uuid().describe('Unique identifier for the request'),
  timestamp: z.string().datetime().describe('ISO timestamp of response generation'),
  rateLimit: z.object({
    remaining: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    reset: z.number().int().positive().describe('Unix timestamp (seconds)'),
  }).optional().describe('Rate limit information if applicable'),
  pagination: z.object({
    limit: z.number().int().nonnegative().optional(),
    offset: z.number().int().nonnegative().optional(),
    total: z.number().int().nonnegative().optional(),
  }).optional().describe('Pagination information if applicable'),
});

export const createSuccessDetailSchema = <T extends z.ZodTypeAny = z.ZodAny>(
  detailsSchema: T = z.any().optional() as unknown as T,
) =>
  z.object({
    platform: z.string(),
    userId: z.string(),
    details: detailsSchema,
    status: z.literal('success'),
  }).catchall(z.any());

export const SuccessDetailSchema = createSuccessDetailSchema(); // Default to any

export const HealthStatusSchema = z.object({
  status: z.string().describe('Health status of the API'),
  version: z.string().optional().describe('API version'),
  timestamp: z.string().datetime().describe('Current server time'),
}).describe('Health status response');

export const MultiStatusSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  succeeded: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});

export const createMultiStatusDataSchema = <
  TDetailSchema extends z.ZodTypeAny = z.ZodAny,
>(
  detailsSchema?: TDetailSchema,
) =>
  z.object({
    summary: MultiStatusSummarySchema,
    results: z.array(
      detailsSchema ? createSuccessDetailSchema(detailsSchema) : SuccessDetailSchema, // Uses default createSuccessDetailSchema() if no specific schema passed
    ),
    errors: z.array(ErrorDetailSchema),
  });

export const MultiStatusDataSchema = createMultiStatusDataSchema(); // Default to any for details

export interface ApiResponse<T> {
  success: boolean;
  data?: T | null; // Allow null for success without data, updated type name
  errors?: ErrorDetail[] | null; // Allow null for success
  meta: ResponseMeta; // Mandatory, holds request id
}

export type ResponseMeta = z.infer<typeof ResponseMetaSchema>;
export type SuccessDetail<T = any> = Omit<z.infer<typeof SuccessDetailSchema>, 'details'> & {
  details?: T;
};
export type MultiStatusSummary = z.infer<typeof MultiStatusSummarySchema>;

export type MultiStatusData<TDetail = any> = {
  summary: MultiStatusSummary;
  results: SuccessDetail<TDetail>[];
  errors: ErrorDetail[];
};
export type HealthStatus = z.infer<typeof HealthStatusSchema>;
