import { Platform, PlatformName } from '@crosspost/types';

/**
 * Generate a URL for a post on a specific platform
 * @param platform Platform name
 * @param postId Post ID
 * @returns URL to the post on the platform, or undefined if the platform is not supported
 */
export function getPostUrl(platform: PlatformName, postId: string): string | undefined {
  switch (platform) {
    case Platform.TWITTER:
      // Twitter URLs format: https://twitter.com/[user_handle]/status/[postId]
      // Since we store userId (numeric) not handle (alphanumeric), we use a generic format
      return `https://twitter.com/i/web/status/${postId}`;

    // Add cases for other platforms as they are implemented
    // case PlatformName.Facebook:
    //   return `https://facebook.com/...`;

    default:
      return undefined;
  }
}
