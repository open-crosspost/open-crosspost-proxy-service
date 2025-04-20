import { z } from 'zod';
import { PlatformSchema } from './common.ts';

export const UserProfileSchema = z.object({
  userId: z.string().describe('User ID on the platform'),
  username: z.string().describe('Username on the platform'),
  url: z.string().url().optional().describe('URL to the user profile'),
  profileImageUrl: z.string().describe('URL to the user profile image'),
  isPremium: z.boolean().optional().describe('Whether the user has a premium account'),
  platform: PlatformSchema.describe('The platform the user profile is from'),
  lastUpdated: z.number().describe('Timestamp when the profile was last updated'),
}).describe('User profile');

export const ProfileRefreshResponseSchema = z.object({
  profile: UserProfileSchema.optional().describe('The refreshed user profile (if successful)'),
}).describe('Profile refresh response');

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type ProfileRefreshResponse = z.infer<typeof ProfileRefreshResponseSchema>;
