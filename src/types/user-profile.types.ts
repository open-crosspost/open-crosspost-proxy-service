import { PlatformName } from './platform.types.ts';

/**
 * User Profile interface
 * Common interface for user profiles across platforms
 */
export interface UserProfile {
  userId: string;
  username: string;
  url?: string;
  profileImageUrl: string;
  isPremium?: boolean;
  platform: PlatformName;
  lastUpdated: number; // timestamp
}

/**
 * Profile refresh result
 */
export interface ProfileRefreshResult {
  success: boolean;
  profile?: UserProfile;
  error?: string;
}
