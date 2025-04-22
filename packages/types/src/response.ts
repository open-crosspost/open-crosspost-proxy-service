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
    page: z.number().int().positive().optional(),
    perPage: z.number().int().positive().optional(),
    total: z.number().int().nonnegative().optional(),
    limit: z.number().int().nonnegative().optional(),
    offset: z.number().int().nonnegative().optional(),
    totalPages: z.number().int().nonnegative().optional(),
    nextCursor: z.string().optional(),
    prevCursor: z.string().optional(),
  }).optional().describe('Pagination information if applicable'),
});

export const SuccessDetailSchema = z.object({
  platform: z.string(),
  userId: z.string(),
  details: z.any().optional(),
  status: z.literal('success'),
}).catchall(z.any());

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

export const MultiStatusDataSchema = z.object({
  summary: MultiStatusSummarySchema,
  results: z.array(SuccessDetailSchema),
  errors: z.array(ErrorDetailSchema),
});

export interface ApiResponse<T> {
  success: boolean;
  data?: T | MultiStatusData | null; // Allow null for success without data, updated type name
  errors?: ErrorDetail[] | null; // Allow null for success
  meta: ResponseMeta; // Mandatory, holds request id
}

export type ResponseMeta = z.infer<typeof ResponseMetaSchema>;
export type SuccessDetail = z.infer<typeof SuccessDetailSchema>;
export type MultiStatusSummary = z.infer<typeof MultiStatusSummarySchema>;
export type MultiStatusData = z.infer<typeof MultiStatusDataSchema>; // Renamed type
export type HealthStatus = z.infer<typeof HealthStatusSchema>;
