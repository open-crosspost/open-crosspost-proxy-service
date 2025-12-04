import { AuthAdapter } from './adapters/auth';
import { PostAdapter } from './adapters/post';
import { MediaAdapter } from './adapters/media';
import { ProfileAdapter } from './adapters/profile';
import { RateLimitAdapter } from './adapters/rate-limit';
import { ClientFactory } from './client-factory';
import * as PlatformContract from '@crosspost/platform-contract';

export class TwitterService {
  private clientFactory: ClientFactory;
  private authAdapter: AuthAdapter;
  private postAdapter: PostAdapter;
  private mediaAdapter: MediaAdapter;
  private profileAdapter: ProfileAdapter;
  private rateLimitAdapter: RateLimitAdapter;

  constructor(
    private clientId: string,
    private clientSecret: string
  ) {
    this.clientFactory = new ClientFactory(clientId, clientSecret);
    this.authAdapter = new AuthAdapter(clientId, clientSecret);
    this.postAdapter = new PostAdapter(this.clientFactory);
    this.mediaAdapter = new MediaAdapter(this.clientFactory);
    this.profileAdapter = new ProfileAdapter(this.clientFactory);
    this.rateLimitAdapter = new RateLimitAdapter(this.clientFactory);
  }

  // Auth methods
  getAuthUrl(input: PlatformContract.GetAuthUrlInput) {
    return this.authAdapter.getAuthUrl(input);
  }

  exchangeCodeForToken(input: PlatformContract.ExchangeCodeInput) {
    return this.authAdapter.exchangeCodeForToken(input);
  }

  refreshToken(input: PlatformContract.RefreshTokenInput) {
    return this.authAdapter.refreshToken(input);
  }

  revokeToken(input: PlatformContract.RevokeTokenInput) {
    return this.authAdapter.revokeToken(input);
  }

  // Post methods
  createPost(input: PlatformContract.CreatePostInput) {
    return this.postAdapter.create(input);
  }

  deletePost(input: PlatformContract.DeletePostInput) {
    return this.postAdapter.delete(input);
  }

  repost(input: PlatformContract.RepostInput) {
    return this.postAdapter.repost(input);
  }

  quotePost(input: PlatformContract.QuotePostInput) {
    return this.postAdapter.quote(input);
  }

  replyToPost(input: PlatformContract.ReplyInput) {
    return this.postAdapter.reply(input);
  }

  likePost(input: PlatformContract.LikeInput) {
    return this.postAdapter.like(input);
  }

  unlikePost(input: PlatformContract.UnlikeInput) {
    return this.postAdapter.unlike(input);
  }

  // Media methods
  uploadMedia(input: PlatformContract.UploadMediaInput) {
    return this.mediaAdapter.upload(input);
  }

  getMediaStatus(input: PlatformContract.GetMediaStatusInput) {
    return this.mediaAdapter.getStatus(input);
  }

  updateMediaMetadata(input: PlatformContract.UpdateMediaMetadataInput) {
    return this.mediaAdapter.updateMetadata(input);
  }

  // Profile methods
  getProfile(input: PlatformContract.GetProfileInput) {
    return this.profileAdapter.get(input);
  }

  // Rate limit methods
  checkRateLimit(input: PlatformContract.CheckRateLimitInput) {
    return this.rateLimitAdapter.check(input);
  }
}
