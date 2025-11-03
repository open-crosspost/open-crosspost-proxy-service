import { CommonPluginErrors } from 'every-plugin';
import { oc } from 'every-plugin/orpc';
import { z } from 'every-plugin/zod';
import * as AuthSchemas from './schemas/auth';
import * as PostSchemas from './schemas/post';
import * as MediaSchemas from './schemas/media';
import * as ProfileSchemas from './schemas/profile';
import * as RateLimitSchemas from './schemas/rate-limit';

/**
 * Platform Plugin Contract
 * Defines the interface that all platform plugins must implement
 */
export const platformContract = oc.router({
  // AUTH DOMAIN - OAuth flow operations
  auth: oc.router({
    getAuthUrl: oc
      .route({ method: 'GET', path: '/auth/url' })
      .input(AuthSchemas.GetAuthUrlInputSchema)
      .output(z.string())
      .errors(CommonPluginErrors),

    exchangeCodeForToken: oc
      .route({ method: 'POST', path: '/auth/token' })
      .input(AuthSchemas.ExchangeCodeInputSchema)
      .output(AuthSchemas.AuthTokenSchema)
      .errors(CommonPluginErrors),

    refreshToken: oc
      .route({ method: 'POST', path: '/auth/refresh' })
      .input(AuthSchemas.RefreshTokenInputSchema)
      .output(AuthSchemas.AuthTokenSchema)
      .errors(CommonPluginErrors),

    revokeToken: oc
      .route({ method: 'DELETE', path: '/auth/token' })
      .input(AuthSchemas.RevokeTokenInputSchema)
      .output(z.boolean())
      .errors(CommonPluginErrors),
  }),

  // POST DOMAIN - Social media post operations
  post: oc.router({
    create: oc
      .route({ method: 'POST', path: '/post' })
      .input(PostSchemas.CreatePostInputSchema)
      .output(PostSchemas.PostResultSchema)
      .errors(CommonPluginErrors),

    delete: oc
      .route({ method: 'DELETE', path: '/post/{postId}' })
      .input(PostSchemas.DeletePostInputSchema)
      .output(PostSchemas.DeleteResultSchema)
      .errors(CommonPluginErrors),

    repost: oc
      .route({ method: 'POST', path: '/post/{postId}/repost' })
      .input(PostSchemas.RepostInputSchema)
      .output(PostSchemas.PostResultSchema)
      .errors(CommonPluginErrors),

    quote: oc
      .route({ method: 'POST', path: '/post/{postId}/quote' })
      .input(PostSchemas.QuotePostInputSchema)
      .output(PostSchemas.PostResultSchema)
      .errors(CommonPluginErrors),

    reply: oc
      .route({ method: 'POST', path: '/post/{postId}/reply' })
      .input(PostSchemas.ReplyInputSchema)
      .output(PostSchemas.PostResultSchema)
      .errors(CommonPluginErrors),

    like: oc
      .route({ method: 'POST', path: '/post/{postId}/like' })
      .input(PostSchemas.LikeInputSchema)
      .output(PostSchemas.LikeResultSchema)
      .errors(CommonPluginErrors),

    unlike: oc
      .route({ method: 'DELETE', path: '/post/{postId}/like' })
      .input(PostSchemas.UnlikeInputSchema)
      .output(PostSchemas.LikeResultSchema)
      .errors(CommonPluginErrors),
  }),

  // MEDIA DOMAIN - Media upload and management
  media: oc.router({
    upload: oc
      .route({ method: 'POST', path: '/media' })
      .input(MediaSchemas.UploadMediaInputSchema)
      .output(MediaSchemas.MediaUploadResultSchema)
      .errors(CommonPluginErrors),

    getStatus: oc
      .route({ method: 'GET', path: '/media/{mediaId}/status' })
      .input(MediaSchemas.GetMediaStatusInputSchema)
      .output(MediaSchemas.MediaStatusResultSchema)
      .errors(CommonPluginErrors),

    updateMetadata: oc
      .route({ method: 'PUT', path: '/media/{mediaId}/metadata' })
      .input(MediaSchemas.UpdateMediaMetadataInputSchema)
      .output(z.boolean())
      .errors(CommonPluginErrors),
  }),

  // PROFILE DOMAIN - User profile operations
  profile: oc.router({
    get: oc
      .route({ method: 'GET', path: '/profile' })
      .input(ProfileSchemas.GetProfileInputSchema)
      .output(ProfileSchemas.UserProfileSchema)
      .errors(CommonPluginErrors),
  }),

  // RATE LIMIT DOMAIN - Rate limit checking
  rateLimit: oc.router({
    check: oc
      .route({ method: 'GET', path: '/rate-limit' })
      .input(RateLimitSchemas.CheckRateLimitInputSchema)
      .output(RateLimitSchemas.RateLimitStatusSchema)
      .errors(CommonPluginErrors),
  }),
});

export type PlatformContract = typeof platformContract;
