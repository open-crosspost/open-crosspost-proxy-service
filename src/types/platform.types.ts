/**
 * Platform Types
 * Defines constants and types for supported social media platforms
 */

/**
 * Enum for supported platforms
 */
export enum Platform {
  TWITTER = 'twitter',
  // Add more platforms as they're implemented
  // LINKEDIN = 'linkedin',
  // FACEBOOK = 'facebook',
  // INSTAGRAM = 'instagram',
}

/**
 * Type for platform names
 * This allows for type-safe platform name usage
 */
export type PlatformName = `${Platform}`;

/**
 * Check if a string is a valid platform name
 * @param platform The platform name to check
 * @returns True if the platform is supported
 */
export function isSupportedPlatform(platform: string): platform is PlatformName {
  return Object.values(Platform).includes(platform as Platform);
}
