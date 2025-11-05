import { oc } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import * as AuthSchemas from './schemas/auth';
import * as MediaSchemas from './schemas/media';
import * as PostSchemas from './schemas/post';
import * as ProfileSchemas from './schemas/profile';
import * as RateLimitSchemas from './schemas/rate-limit';

/**
 * Platform Plugin Contract
 * Defines the interface that all platform plugins must implement
 */
export const platformContract = oc.router({
  // AUTH DOMAIN - OAuth flow operations
  auth: {
    getAuthUrl: oc
      .route({ method: 'GET', path: '/auth/url' })
      .input(AuthSchemas.GetAuthUrlInputSchema)
      .output(z.string()),
    exchangeCodeForToken: oc
      .route({ method: 'POST', path: '/auth/token' })
      .input(AuthSchemas.ExchangeCodeInputSchema)
      .output(AuthSchemas.AuthTokenSchema),
    refreshToken: oc
      .route({ method: 'POST', path: '/auth/refresh' })
      .input(AuthSchemas.RefreshTokenInputSchema)
      .output(AuthSchemas.AuthTokenSchema),
    revokeToken: oc
      .route({ method: 'DELETE', path: '/auth/token' })
      .input(AuthSchemas.RevokeTokenInputSchema)
      .output(z.boolean())
  },

  // POST DOMAIN - Social media post operations
  post: {
    create: oc
      .route({ method: 'POST', path: '/post' })
      .input(PostSchemas.CreatePostInputSchema)
      .output(PostSchemas.PostResultSchema),
    delete: oc
      .route({ method: 'DELETE', path: '/post/{postId}' })
      .input(PostSchemas.DeletePostInputSchema)
      .output(PostSchemas.DeleteResultSchema),
    repost: oc
      .route({ method: 'POST', path: '/post/{postId}/repost' })
      .input(PostSchemas.RepostInputSchema)
      .output(PostSchemas.PostResultSchema),
    quote: oc
      .route({ method: 'POST', path: '/post/{postId}/quote' })
      .input(PostSchemas.QuotePostInputSchema)
      .output(PostSchemas.PostResultSchema),
    reply: oc
      .route({ method: 'POST', path: '/post/{postId}/reply' })
      .input(PostSchemas.ReplyInputSchema)
      .output(PostSchemas.PostResultSchema),
    like: oc
      .route({ method: 'POST', path: '/post/{postId}/like' })
      .input(PostSchemas.LikeInputSchema)
      .output(PostSchemas.LikeResultSchema),
    unlike: oc
      .route({ method: 'DELETE', path: '/post/{postId}/like' })
      .input(PostSchemas.UnlikeInputSchema)
      .output(PostSchemas.LikeResultSchema)
  },

  // MEDIA DOMAIN - Media upload and management
  media: {
    upload: oc
      .route({ method: 'POST', path: '/media' })
      .input(MediaSchemas.UploadMediaInputSchema)
      .output(MediaSchemas.MediaUploadResultSchema),
    getStatus: oc
      .route({ method: 'GET', path: '/media/{mediaId}/status' })
      .input(MediaSchemas.GetMediaStatusInputSchema)
      .output(MediaSchemas.MediaStatusResultSchema),
    updateMetadata: oc
      .route({ method: 'PUT', path: '/media/{mediaId}/metadata' })
      .input(MediaSchemas.UpdateMediaMetadataInputSchema)
      .output(z.boolean())
  },

  // PROFILE DOMAIN - User profile operations
  profile: {
    get: oc
      .route({ method: 'GET', path: '/profile' })
      .input(ProfileSchemas.GetProfileInputSchema)
      .output(ProfileSchemas.UserProfileSchema)
  },

  // RATE LIMIT DOMAIN - Rate limit checking
  rateLimit: {
    check: oc
      .route({ method: 'GET', path: '/rate-limit' })
      .input(RateLimitSchemas.CheckRateLimitInputSchema)
      .output(RateLimitSchemas.RateLimitStatusSchema)
  },
});

export type PlatformContract = typeof platformContract;
