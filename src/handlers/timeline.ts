import { Env } from '../index';
import { TimelineService } from '../services/TimelineService';

/**
 * Timeline handlers
 */
export const timelineRoutes = {
  /**
   * Get a user's timeline
   */
  async getUserTimeline(request: Request): Promise<Response> {
    // Get the environment from the request
    const env = (request as any).env as Env;
    
    // Create a Timeline service instance
    const timelineService = new TimelineService(env);
    
    // Get the user's timeline
    return await timelineService.getUserTimeline(request);
  },
  
  /**
   * Get a user's mentions
   */
  async getUserMentions(request: Request): Promise<Response> {
    // Get the environment from the request
    const env = (request as any).env as Env;
    
    // Create a Timeline service instance
    const timelineService = new TimelineService(env);
    
    // Get the user's mentions
    return await timelineService.getUserMentions(request);
  },
  
  /**
   * Get a user's liked tweets
   */
  async getUserLikes(request: Request): Promise<Response> {
    // Get the environment from the request
    const env = (request as any).env as Env;
    
    // Create a Timeline service instance
    const timelineService = new TimelineService(env);
    
    // Get the user's liked tweets
    return await timelineService.getUserLikes(request);
  },
  
  /**
   * Get a tweet by ID
   */
  async getTweet(request: Request): Promise<Response> {
    // Get the environment from the request
    const env = (request as any).env as Env;
    
    // Create a Timeline service instance
    const timelineService = new TimelineService(env);
    
    // Get the tweet
    return await timelineService.getTweet(request);
  },
};
