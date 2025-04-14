/**
 * Common Schemas and Types
 * Defines common Zod schemas and derived TypeScript types used across the API
 */

import { z } from 'zod';

/**
 * Platform enum - All platforms (including planned ones)
 */
export enum Platform {
  UNKNOWN = 'unknown',
  TWITTER = 'twitter',
  // Add more platforms as they're implemented
  // LINKEDIN = 'linkedin',
  // FACEBOOK = 'facebook',
  // INSTAGRAM = 'instagram',
}

export const PlatformSchema = z.nativeEnum(Platform)
  .describe('Social media platform');

/**
 * Platform type - Derived from the Platform enum
 */
export type PlatformName = Platform;

/**
 * Array of currently supported platforms
 */
export const SUPPORTED_PLATFORMS = [
  Platform.TWITTER,
  // Add more platforms here as they're implemented
] as const;

export type SupportedPlatformName = typeof SUPPORTED_PLATFORMS[number];

export const SupportedPlatformSchema = SUPPORTED_PLATFORMS.length > 0
  ? z.enum(SUPPORTED_PLATFORMS)
  : z.never();

SupportedPlatformSchema.describe('Currently supported social media platforms');

/**
 * Check if a platform is currently supported
 */
export function isPlatformSupported(platform: Platform): platform is SupportedPlatformName {
  return (SUPPORTED_PLATFORMS as readonly Platform[]).includes(platform);
}
