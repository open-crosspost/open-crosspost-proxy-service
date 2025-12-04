// Main exports
export { platformContract } from './contract';
export type { PlatformContract } from './contract';

// Schema exports
export * as AuthSchemas from './schemas/auth';
export * as PostSchemas from './schemas/post';
export * as MediaSchemas from './schemas/media';
export * as ProfileSchemas from './schemas/profile';
export * as RateLimitSchemas from './schemas/rate-limit';

// Type exports
export type { z } from 'every-plugin/zod';
// Auth types
export type { GetAuthUrlInput } from './schemas/auth';
export type { ExchangeCodeInput } from './schemas/auth';
export type { RefreshTokenInput } from './schemas/auth';
export type { RevokeTokenInput } from './schemas/auth';
export type { AuthToken } from './schemas/auth';
// Post types
export type { MediaContent } from './schemas/post';
export type { PostContent } from './schemas/post';
export type { CreatePostInput } from './schemas/post';
export type { DeletePostInput } from './schemas/post';
export type { RepostInput } from './schemas/post';
export type { QuotePostInput } from './schemas/post';
export type { ReplyInput } from './schemas/post';
export type { LikeInput } from './schemas/post';
export type { UnlikeInput } from './schemas/post';
export type { PostResult } from './schemas/post';
export type { DeleteResult } from './schemas/post';
export type { LikeResult } from './schemas/post';
// Media types
export type { UploadMediaInput } from './schemas/media';
export type { GetMediaStatusInput } from './schemas/media';
export type { UpdateMediaMetadataInput } from './schemas/media';
export type { MediaUploadResult } from './schemas/media';
export type { MediaStatusResult } from './schemas/media';
// Profile types
export type { GetProfileInput } from './schemas/profile';
export type { UserProfile } from './schemas/profile';
// Rate limit types
export type { CheckRateLimitInput } from './schemas/rate-limit';
export type { RateLimitStatus } from './schemas/rate-limit';
