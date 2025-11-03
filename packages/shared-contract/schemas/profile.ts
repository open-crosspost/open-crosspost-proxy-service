import { z } from 'every-plugin/zod';
import { AuthenticatedRequest } from './auth';

/**
 * Get profile input schema
 */
export const GetProfileInputSchema = AuthenticatedRequest.extend({
  // userId is already in AuthenticatedRequest
});
export type GetProfileInput = z.infer<typeof GetProfileInputSchema>;

/**
 * User profile schema
 */
export const UserProfileSchema = z.object({
  id: z.string().describe('User ID'),
  username: z.string().optional().describe('Username'),
  displayName: z.string().optional().describe('Display name'),
  bio: z.string().optional().describe('User bio'),
  avatar: z.string().optional().describe('Avatar URL'),
  banner: z.string().optional().describe('Banner URL'),
  followersCount: z.number().optional().describe('Number of followers'),
  followingCount: z.number().optional().describe('Number of following'),
  postsCount: z.number().optional().describe('Number of posts'),
  verified: z.boolean().optional().describe('Whether the user is verified'),
  createdAt: z.string().optional().describe('Account creation date'),
}).catchall(z.any()).describe('User profile');
export type UserProfile = z.infer<typeof UserProfileSchema>;
