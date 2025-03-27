/**
 * Twitter Proxy SDK
 * 
 * A simple TypeScript SDK for interacting with the Twitter Proxy API.
 * This SDK provides a clean interface for all tweet operations.
 */

// Types
export interface MediaFile {
  data: string | Blob;  // Base64 string or Blob
  mimeType?: string;
  alt_text?: string;
}

export interface TweetInput {
  text?: string;
  media?: MediaFile[];
  reply_to?: string;
  quote?: string;
}

export interface TwitterProxyConfig {
  baseUrl: string;
  apiKey: string;
}

export interface TwitterResponse {
  data: any;
  meta?: any;
  errors?: any[];
}

/**
 * Twitter Proxy SDK class
 */
export class TwitterProxySDK {
  private config: TwitterProxyConfig;
  
  /**
   * Create a new TwitterProxySDK instance
   */
  constructor(config: TwitterProxyConfig) {
    this.config = config;
  }
  
  /**
   * Post a tweet or thread
   * @param input A single tweet or an array of tweets for a thread
   */
  async tweet(input: TweetInput | TweetInput[]): Promise<TwitterResponse> {
    return this.post('/api/tweets', input);
  }
  
  /**
   * Post a simple text tweet
   * @param text The tweet text
   */
  async postText(text: string): Promise<TwitterResponse> {
    return this.tweet({ text });
  }
  
  /**
   * Reply to a tweet
   * @param tweetId The ID of the tweet to reply to
   * @param text The reply text
   * @param media Optional media to include
   */
  async reply(tweetId: string, text: string, media?: MediaFile[]): Promise<TwitterResponse> {
    return this.tweet({
      text,
      reply_to: tweetId,
      media
    });
  }
  
  /**
   * Quote a tweet
   * @param tweetId The ID of the tweet to quote
   * @param text The quote text
   * @param media Optional media to include
   */
  async quote(tweetId: string, text: string, media?: MediaFile[]): Promise<TwitterResponse> {
    return this.tweet({
      text,
      quote: tweetId,
      media
    });
  }
  
  /**
   * Retweet a tweet
   * @param tweetId The ID of the tweet to retweet
   */
  async retweet(tweetId: string): Promise<TwitterResponse> {
    return this.post('/api/retweet', { tweetId });
  }
  
  /**
   * Like a tweet
   * @param tweetId The ID of the tweet to like
   */
  async like(tweetId: string): Promise<TwitterResponse> {
    return this.post(`/api/like/${tweetId}`, {});
  }
  
  /**
   * Unlike a tweet
   * @param tweetId The ID of the tweet to unlike
   */
  async unlike(tweetId: string): Promise<TwitterResponse> {
    return this.delete(`/api/like/${tweetId}`);
  }
  
  /**
   * Delete a tweet
   * @param tweetId The ID of the tweet to delete
   */
  async deleteTweet(tweetId: string): Promise<TwitterResponse> {
    return this.delete(`/api/tweet/${tweetId}`);
  }
  
  /**
   * Get a user's timeline
   */
  async getTimeline(): Promise<TwitterResponse> {
    return this.get('/api/timeline');
  }
  
  /**
   * Get a user's mentions
   */
  async getMentions(): Promise<TwitterResponse> {
    return this.get('/api/mentions');
  }
  
  /**
   * Get a user's likes
   */
  async getLikes(): Promise<TwitterResponse> {
    return this.get('/api/likes');
  }
  
  /**
   * Get a specific tweet
   * @param tweetId The ID of the tweet to get
   */
  async getTweet(tweetId: string): Promise<TwitterResponse> {
    return this.get(`/api/tweet/${tweetId}`);
  }
  
  /**
   * Upload media and get a media ID
   * @param media The media file to upload
   */
  async uploadMedia(media: MediaFile): Promise<TwitterResponse> {
    const formData = new FormData();
    
    if (typeof media.data === 'string') {
      formData.append('media', media.data);
    } else {
      formData.append('media', media.data as Blob);
    }
    
    if (media.mimeType) {
      formData.append('mimeType', media.mimeType);
    }
    
    return this.postFormData('/api/media/upload', formData);
  }
  
  /**
   * Helper method to make GET requests
   */
  private async get(endpoint: string): Promise<TwitterResponse> {
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.config.apiKey
      }
    });
    
    return await response.json();
  }
  
  /**
   * Helper method to make POST requests
   */
  private async post(endpoint: string, data: any): Promise<TwitterResponse> {
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey
      },
      body: JSON.stringify(data)
    });
    
    return await response.json();
  }
  
  /**
   * Helper method to make DELETE requests
   */
  private async delete(endpoint: string): Promise<TwitterResponse> {
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': this.config.apiKey
      }
    });
    
    return await response.json();
  }
  
  /**
   * Helper method to make POST requests with FormData
   */
  private async postFormData(endpoint: string, formData: FormData): Promise<TwitterResponse> {
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.config.apiKey
      },
      body: formData
    });
    
    return await response.json();
  }
}

// Usage example
/*
const twitter = new TwitterProxySDK({
  baseUrl: 'https://your-twitter-proxy.example.com',
  apiKey: 'your-api-key'
});

// Post a simple tweet
twitter.postText('Hello world!').then(response => {
  console.log('Tweet posted:', response);
});

// Post a thread
twitter.tweet([
  { text: 'This is the first tweet in a thread' },
  { text: 'This is the second tweet' },
  { text: 'And this is the final tweet' }
]).then(response => {
  console.log('Thread posted:', response);
});
*/
