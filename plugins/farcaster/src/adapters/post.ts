import { Effect } from 'every-plugin/effect';
import { SendTweetV2Params } from 'twitter-api-v2';
import { ClientFactory } from '../client-factory';
import * as PostSchemas from '@crosspost/platform-contract';

export class PostAdapter {
  constructor(
    private clientFactory: ClientFactory
  ) {}

  /**
   * Create a new post
   * @param input The input parameters for creating a post
   * @returns The created post result
   */
  create(input: PostSchemas.CreatePostInput): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient(input.accessToken);

      // Handle single post or thread
      if (Array.isArray(input.content)) {
        return yield* self.createThread(client, input.content);
      }

      return yield* self.createSinglePost(client, input.content);
    });
  }

  /**
   * Delete a post
   * @param input The input parameters for deleting a post
   * @returns The delete result
   */
  delete(input: PostSchemas.DeletePostInput): Effect.Effect<PostSchemas.DeleteResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient(input.accessToken);

      yield* Effect.tryPromise({
        try: async () => {
          await client.v2.deleteTweet(input.postId);
        },
        catch: (error) => {
          console.error('Error deleting post:', error);
          throw new Error('Failed to delete post');
        }
      });

      return {
        success: true,
        id: input.postId
      };
    });
  }

  /**
   * Repost/retweet an existing post
   * @param input The input parameters for reposting
   * @returns The repost result
   */
  repost(input: PostSchemas.RepostInput): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient(input.accessToken);

      yield* Effect.tryPromise({
        try: async () => {
          await client.v2.retweet(input.userId, input.postId);
        },
        catch: (error) => {
          console.error('Error reposting:', error);
          throw new Error('Failed to repost');
        }
      });

      return {
        id: input.postId,
        createdAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Quote an existing post
   * @param input The input parameters for quoting a post
   * @returns The quote post result
   */
  quote(input: PostSchemas.QuotePostInput): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient(input.accessToken);

      // Handle single quote or thread quote
      if (Array.isArray(input.content)) {
        return yield* self.createQuoteThread(client, input.postId, input.content);
      }

      return yield* self.createQuotePost(client, input.postId, input.content);
    });
  }

  /**
   * Reply to an existing post
   * @param input The input parameters for replying to a post
   * @returns The reply post result
   */
  reply(input: PostSchemas.ReplyInput): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient(input.accessToken);

      // Handle single reply or thread reply
      if (Array.isArray(input.content)) {
        return yield* self.createReplyThread(client, input.postId, input.content);
      }

      return yield* self.createReplyPost(client, input.postId, input.content);
    });
  }

  /**
   * Like a post
   * @param input The input parameters for liking a post
   * @returns The like result
   */
  like(input: PostSchemas.LikeInput): Effect.Effect<PostSchemas.LikeResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient(input.accessToken);

      yield* Effect.tryPromise({
        try: async () => {
          await client.v2.like(input.userId, input.postId);
        },
        catch: (error) => {
          console.error('Error liking post:', error);
          throw new Error('Failed to like post');
        }
      });

      return {
        success: true,
        id: input.postId
      };
    });
  }

  /**
   * Unlike a post
   * @param input The input parameters for unliking a post
   * @returns The unlike result
   */
  unlike(input: PostSchemas.UnlikeInput): Effect.Effect<PostSchemas.LikeResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const client = yield* self.clientFactory.createClient(input.accessToken);

      yield* Effect.tryPromise({
        try: async () => {
          await client.v2.unlike(input.userId, input.postId);
        },
        catch: (error) => {
          console.error('Error unliking post:', error);
          throw new Error('Failed to unlike post');
        }
      });

      return {
        success: true,
        id: input.postId
      };
    });
  }

  // Private helper methods

  private createSinglePost(client: any, content: PostSchemas.PostContent): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const text = content?.text || '';
      const tweetData: SendTweetV2Params = { text };

      // TODO: Handle media uploads
      // For now, just create text-only posts

      const result = yield* Effect.tryPromise({
        try: async () => await client.v2.tweet(tweetData),
        catch: (error) => {
          console.error('Error creating single post:', error);
          throw new Error('Failed to create post');
        }
      });

      return {
        id: result.data.id,
        text: result.data.text,
        createdAt: new Date().toISOString(),
      };
    });
  }

  private createThread(client: any, contentArray: PostSchemas.PostContent[]): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const formattedTweets: SendTweetV2Params[] = [];

      for (const content of contentArray) {
        const text = content?.text || '';
        formattedTweets.push({ text });
      }

      const result = yield* Effect.tryPromise({
        try: async () => await client.v2.tweetThread(formattedTweets),
        catch: (error) => {
          console.error('Error creating thread:', error);
          throw new Error('Failed to create thread');
        }
      });

      return {
        id: result[0].data.id,
        text: result[0].data.text,
        createdAt: new Date().toISOString(),
        threadIds: result.map((tweet: any) => tweet.data.id),
      };
    });
  }

  private createQuotePost(client: any, postId: string, content: PostSchemas.PostContent): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const text = content?.text || '';
      const tweetData: SendTweetV2Params = {
        text,
        quote_tweet_id: postId
      };

      const result = yield* Effect.tryPromise({
        try: async () => await client.v2.tweet(tweetData),
        catch: (error) => {
          console.error('Error creating quote post:', error);
          throw new Error('Failed to create quote post');
        }
      });

      return {
        id: result.data.id,
        text: result.data.text,
        createdAt: new Date().toISOString(),
        quotedPostId: postId,
      };
    });
  }

  private createQuoteThread(client: any, postId: string, contentArray: PostSchemas.PostContent[]): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const formattedTweets: SendTweetV2Params[] = [];

      for (let i = 0; i < contentArray.length; i++) {
        const content = contentArray[i];
        const text = content?.text || '';
        const tweetData: SendTweetV2Params = { text };

        // Add quote to first tweet only
        if (i === 0) {
          tweetData.quote_tweet_id = postId;
        }

        formattedTweets.push(tweetData);
      }

      const result = yield* Effect.tryPromise({
        try: async () => await client.v2.tweetThread(formattedTweets),
        catch: (error) => {
          console.error('Error creating quote thread:', error);
          throw new Error('Failed to create quote thread');
        }
      });

      return {
        id: result[0].data.id,
        text: result[0].data.text,
        createdAt: new Date().toISOString(),
        quotedPostId: postId,
        threadIds: result.map((tweet: any) => tweet.data.id),
      };
    });
  }

  private createReplyPost(client: any, postId: string, content: PostSchemas.PostContent): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const text = content?.text || '';
      const tweetData: SendTweetV2Params = {
        text,
        reply: { in_reply_to_tweet_id: postId }
      };

      const result = yield* Effect.tryPromise({
        try: async () => await client.v2.tweet(tweetData),
        catch: (error) => {
          console.error('Error creating reply post:', error);
          throw new Error('Failed to create reply post');
        }
      });

      return {
        id: result.data.id,
        text: result.data.text,
        createdAt: new Date().toISOString(),
        inReplyToId: postId,
      };
    });
  }

  private createReplyThread(client: any, postId: string, contentArray: PostSchemas.PostContent[]): Effect.Effect<PostSchemas.PostResult, Error> {
    const self = this;
    return Effect.gen(function* () {
      const formattedTweets: SendTweetV2Params[] = [];

      for (let i = 0; i < contentArray.length; i++) {
        const content = contentArray[i];
        const text = content?.text || '';
        const tweetData: SendTweetV2Params = { text };

        // Add reply to first tweet only
        if (i === 0) {
          tweetData.reply = { in_reply_to_tweet_id: postId };
        }

        formattedTweets.push(tweetData);
      }

      const result = yield* Effect.tryPromise({
        try: async () => await client.v2.tweetThread(formattedTweets),
        catch: (error) => {
          console.error('Error creating reply thread:', error);
          throw new Error('Failed to create reply thread');
        }
      });

      return {
        id: result[0].data.id,
        text: result[0].data.text,
        createdAt: new Date().toISOString(),
        inReplyToId: postId,
        threadIds: result.map((tweet: any) => tweet.data.id),
      };
    });
  }
}
