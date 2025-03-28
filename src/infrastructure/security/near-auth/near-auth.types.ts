/**
 * NEAR Authentication Types
 * Defines types for NEAR authentication data
 */
import { BorshSchema } from 'npm:borsher';
import { z } from 'zod';

/**
 * NEAR Authentication Data
 * Contains the data needed for NEAR authentication
 */
export interface NearAuthData {
  /**
   * NEAR account ID
   */
  account_id: string;

  /**
   * Public key used for signing
   */
  public_key: string;

  /**
   * Signature of the message
   */
  signature: string;

  /**
   * Message that was signed
   */
  message: string;

  /**
   * Nonce used for signing
   */
  nonce: string;

  /**
   * Recipient of the message
   */
  recipient?: string;

  /**
   * Callback URL
   */
  callback_url?: string;
}

/**
 * NEAR Authentication Payload
 * Represents the payload that was signed
 */
export interface NearAuthPayload {
  /**
   * Tag value for the payload (2147484061)
   */
  tag: number;

  /**
   * Message that was signed
   */
  message: string;

  /**
   * Nonce used for signing
   */
  nonce: Uint8Array;

  /**
   * Recipient of the message
   */
  receiver: string;

  /**
   * Callback URL
   */
  callback_url?: string;
}

/**
 * NEAR Authentication Payload Schema for borsher serialization
 */
export const PAYLOAD_SCHEMA = {
  tag: BorshSchema.u32,
  message: BorshSchema.String,
  nonce: BorshSchema.Array(BorshSchema.u8, 32),
  receiver: BorshSchema.String,
  callback_url: BorshSchema.Option(BorshSchema.String),
};

/**
 * NEAR Authentication Result
 * Result of NEAR authentication validation
 */
export interface NearAuthResult {
  /**
   * Whether the authentication is valid
   */
  valid: boolean;

  /**
   * NEAR account ID if valid
   */
  signerId?: string;

  /**
   * Error message if invalid
   */
  error?: string;
}

/**
 * Zod schema for NEAR Authentication Data
 */
export const nearAuthDataSchema = z.object({
  account_id: z.string().min(1, 'Account ID is required'),
  public_key: z.string().min(1, 'Public key is required'),
  signature: z.string().min(1, 'Signature is required'),
  message: z.string().min(1, 'Message is required'),
  nonce: z.string().min(1, 'Nonce is required'),
  recipient: z.string().optional().default('crosspost.near'),
  callback_url: z.string().optional(),
});

/**
 * Type for Zod-validated NEAR Authentication Data
 */
export type ValidatedNearAuthData = z.infer<typeof nearAuthDataSchema>;
