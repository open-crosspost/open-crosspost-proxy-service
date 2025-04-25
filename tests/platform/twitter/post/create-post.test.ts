import { describe, it } from 'jsr:@std/testing/bdd';
import { assert, assertEquals, assertInstanceOf, fail } from 'jsr:@std/assert';
import { TwitterCreatePost } from '../../../../src/infrastructure/platform/twitter/post/create.ts';
import { TwitterError } from '../../../../src/infrastructure/platform/twitter/twitter-error.ts';
import { TwitterClientMock } from '../../../mocks/twitter/twitter-client-mock.ts';
import { ApiErrorCode, MediaContent, Platform, PostContent } from '@crosspost/types';
import { ApiResponseError } from 'twitter-api-v2';
import { createMockTwitterError } from '../../../utils/twitter-utils.ts';

// Mock TwitterMedia class for testing with error simulation capability
class TwitterMediaMock {
  private shouldThrowError = false;
  private errorToThrow: Error | null = null;

  async uploadMedia(_userId: string, _media: MediaContent) {
    if (this.shouldThrowError && this.errorToThrow) {
      throw this.errorToThrow;
    }
    return { mediaId: `mock-media-id-${Date.now()}` };
  }

  setErrorToThrow(error: Error) {
    this.shouldThrowError = true;
    this.errorToThrow = error;
  }
}

describe('TwitterCreatePost', () => {
  describe('createPost', () => {
    it('should successfully create a single post', async () => {
      // Setup
      const twitterClient = new TwitterClientMock({});
      const twitterMedia = new TwitterMediaMock();
      const createPost = new TwitterCreatePost(twitterClient, twitterMedia as any);

      // Execute
      const result = await createPost.createPost('test-user-id', { text: 'Test post' });

      // Verify
      assertEquals(typeof result.id, 'string');
      assertEquals(typeof result.text, 'string');
      assertEquals(typeof result.createdAt, 'string');
      // mediaIds should be an empty array for text-only posts
      assertEquals(result.mediaIds, [], 'mediaIds should be an empty array');
      assert(!result.threadIds, 'threadIds should not be present');
    });

    it('should successfully create a post with media', async () => {
      // Setup
      const twitterClient = new TwitterClientMock({});
      const twitterMedia = new TwitterMediaMock();
      const createPost = new TwitterCreatePost(twitterClient, twitterMedia as any);

      const content: PostContent = {
        text: 'Test post with media',
        media: [{ data: 'https://example.com/image.jpg', mimeType: 'image/jpeg' }],
      };

      // Execute
      const result = await createPost.createPost('test-user-id', content);

      // Verify
      assertEquals(typeof result.id, 'string');
      assertEquals(typeof result.text, 'string');
      assertEquals(typeof result.createdAt, 'string');
      assert(Array.isArray(result.mediaIds), 'mediaIds should be an array');
      assert(result.mediaIds.length > 0, 'mediaIds should not be empty');
      assert(!result.threadIds, 'threadIds should not be present');
    });

    it('should successfully create a thread', async () => {
      // Setup
      const twitterClient = new TwitterClientMock({});
      const twitterMedia = new TwitterMediaMock();
      const createPost = new TwitterCreatePost(twitterClient, twitterMedia as any);

      const threadContent = [
        { text: 'First tweet in thread' },
        { text: 'Second tweet in thread' },
        { text: 'Third tweet in thread' },
      ];

      // Execute
      const result = await createPost.createPost('test-user-id', threadContent);

      // Verify
      assertEquals(typeof result.id, 'string');
      assertEquals(typeof result.text, 'string');
      assertEquals(typeof result.createdAt, 'string');
      assert(!result.mediaIds, 'mediaIds should not be present');
      assert(Array.isArray(result.threadIds), 'threadIds should be an array');
      assertEquals(result.threadIds?.length, 3, 'threadIds should contain all thread tweets');
    });

    it('should successfully create a thread with media', async () => {
      // Setup
      const twitterClient = new TwitterClientMock({});
      const twitterMedia = new TwitterMediaMock();
      const createPost = new TwitterCreatePost(twitterClient, twitterMedia as any);

      const threadContent = [
        {
          text: 'First tweet with image',
          media: [{ data: 'https://example.com/image1.jpg', mimeType: 'image/jpeg' }],
        },
        {
          text: 'Second tweet with image',
          media: [{ data: 'https://example.com/image2.jpg', mimeType: 'image/jpeg' }],
        },
      ];

      // Execute
      const result = await createPost.createPost('test-user-id', threadContent);

      // Verify
      assertEquals(typeof result.id, 'string');
      assertEquals(typeof result.text, 'string');
      assertEquals(typeof result.createdAt, 'string');
      assert(!result.mediaIds, 'mediaIds should not be present on thread result');
      assert(Array.isArray(result.threadIds), 'threadIds should be an array');
      assertEquals(result.threadIds?.length, 2, 'threadIds should contain all thread tweets');
    });

    it('should handle empty text content', async () => {
      // Setup
      const twitterClient = new TwitterClientMock({});
      const twitterMedia = new TwitterMediaMock();
      const createPost = new TwitterCreatePost(twitterClient, twitterMedia as any);

      // Execute
      const result = await createPost.createPost('test-user-id', { text: '' });

      // Verify
      assertEquals(typeof result.id, 'string');
      assertEquals(result.text, '');
      assertEquals(typeof result.createdAt, 'string');
    });

    it('should handle duplicate content error', async () => {
      // Setup
      const duplicateError = createMockTwitterError(
        187,
        'Status is a duplicate',
      );
      // Configure the client mock to throw the specific error when tweet is called
      const twitterClient = new TwitterClientMock({});
      const twitterError = TwitterError.fromTwitterApiError(duplicateError);
      twitterClient.setErrorToThrow('tweet', twitterError);
      const twitterMedia = new TwitterMediaMock();
      const createPost = new TwitterCreatePost(twitterClient, twitterMedia as any);

      try {
        // Execute
        await createPost.createPost('test-user-id', { text: 'Duplicate post' });
        fail('Expected error was not thrown');
      } catch (error) {
        // First check if we got any error at all
        assert(error instanceof Error, `Expected an Error but got ${typeof error}`);

        // Verify the error properties are correctly mapped by TwitterError.fromTwitterApiError
        // Note: We expect the caught error to be a TwitterError instance,
        // even though the mock throws a MockTwitterApiError, because
        // TwitterCreatePost should wrap it using TwitterError.fromTwitterApiError.
        assert(error instanceof TwitterError, 'Error should be an instance of TwitterError');
        assertEquals(
          error.code,
          ApiErrorCode.DUPLICATE_CONTENT,
          'Mapped error code should be DUPLICATE_CONTENT',
        ); // Expect DUPLICATE_CONTENT now
        assertEquals(error.details?.platform, Platform.TWITTER, 'Platform should be TWITTER');
        assertEquals(
          error.details?.platformErrorCode,
          187,
          'Original platform error code should be 187',
        );
        assert(
          error.message.includes('Duplicate content:'),
          'Error message should indicate duplicate content',
        ); // Check for the mapped message
        // Check if the original mock message is included in the details (and add type check)
        assert(
          typeof error.details?.platformMessage === 'string' &&
            error.details.platformMessage.includes("Status is a duplicate"),
          'Original platform message ("Status is a duplicate") should be included in details',
        );
      }
    });

    it('should handle media upload errors', async () => {
      // Setup
      const mediaError = createMockTwitterError(
        323,
        'The media you tried to upload is too large.',
      );
      // Configure the media mock to throw the specific error during upload
      const twitterClient = new TwitterClientMock({});
      const twitterMedia = new TwitterMediaMock();
      // Transform the error properly
      const twitterError = TwitterError.fromTwitterApiError(mediaError);
      const mediaUploadError = new TwitterError(
        'Media upload failed: The media you tried to upload is too large.',
        ApiErrorCode.MEDIA_UPLOAD_FAILED,
        {
          platform: Platform.TWITTER,
          platformErrorCode: twitterError.details?.platformErrorCode,
          platformMessage: twitterError.details?.platformMessage,
        },
      );
      twitterMedia.setErrorToThrow(mediaUploadError);
      const createPost = new TwitterCreatePost(twitterClient, twitterMedia as any);

      try {
        // Execute
        await createPost.createPost('test-user-id', {
          text: 'Post with media',
          media: [{ data: 'too-large-file.jpg', mimeType: 'image/jpeg' }],
        });
        fail('Expected error was not thrown');
      } catch (error) {
        // First check if we got any error at all
        assert(error instanceof Error, `Expected an Error but got ${typeof error}`);

        // Verify the error properties are correctly mapped by TwitterError.fromTwitterApiError
        assert(error instanceof TwitterError, 'Error should be an instance of TwitterError');
        assertEquals(
          error.code,
          ApiErrorCode.MEDIA_UPLOAD_FAILED,
          'Mapped error code should be MEDIA_UPLOAD_FAILED',
        );
        assertEquals(error.details?.platform, Platform.TWITTER, 'Platform should be TWITTER');
        assert(
          error.message.includes('Media upload failed'),
          'Error message should indicate media upload failure',
        );
      }
    });
  });
});
