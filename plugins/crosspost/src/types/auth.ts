import { z } from 'every-plugin/zod';

// Re-export from near-sign-verify for convenience
export type { NearAuthData } from 'near-sign-verify';

// Zod schema for validation
export const NearAuthDataSchema = z.object({
  account_id: z.string(),
  public_key: z.string(),
  signature: z.string(),
  message: z.string(),
  nonce: z.array(z.number()),
  recipient: z.string(),
  callback_url: z.string().optional(),
});

export type NearAuthData = z.infer<typeof NearAuthDataSchema>;
