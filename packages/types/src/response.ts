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
  additionalData: z.any().optional(),
  status: z.literal('success'),
}).catchall(z.any());

export const MultiStatusDataSchema = z.object({
  summary: z.object({
    total: z.number().int().nonnegative(),
    succeeded: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  }),
  results: z.array(SuccessDetailSchema),
  errors: z.array(ErrorDetailSchema),
});

export interface ApiResponse<T> {
  success: boolean;
  data?: T | MultiStatusData | null; // Allow null for success without data
  errors?: ErrorDetail[] | null; // Allow null for success
  meta: ResponseMeta; // Mandatory, holds request id
}

export type ResponseMeta = z.infer<typeof ResponseMetaSchema>;
export type SuccessDetail = z.infer<typeof SuccessDetailSchema>;
export type MultiStatusData = z.infer<typeof MultiStatusDataSchema>;
