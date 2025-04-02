/**
 * Platform Types
 * Defines constants and types for supported social media platforms
 */
import { Types } from '../../deps.ts';

// Re-export the PlatformName enum from the types package
export type PlatformName = Types.PlatformName;

/**
 * Enum for supported platforms (for backward compatibility)
 */
export enum Platform {
  TWITTER = 'twitter',
  // Add more platforms as they're implemented
  // LINKEDIN = 'linkedin',
  // FACEBOOK = 'facebook',
  // INSTAGRAM = 'instagram',
}

/**
 * Check if a string is a valid platform name
 * @param platform The platform name to check
 * @returns True if the platform is supported
 */
export function isSupportedPlatform(platform: string): platform is PlatformName {
  return Object.values(Types.PlatformName).includes(platform as Types.PlatformName);
}
