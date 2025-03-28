import { Env } from '../config/env.ts';
import { NearAuthData } from '../infrastructure/security/near-auth/near-auth.types.ts';

/**
 * Deno ExecutionContext interface
 */
export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

/**
 * API Key interface
 */
export interface ApiKey {
  id: string;
  key: string;
  permissions: string[];
}

/**
 * Extended Request interface with additional properties used in the application
 */
export interface ExtendedRequest extends Request {
  /**
   * Environment variables and bindings
   */
  env: Env;
  
  /**
   * Execution context for the request
   */
  ctx: ExecutionContext;
  
  /**
   * CORS headers to be applied to the response
   */
  corsHeaders?: {
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Methods': string;
    'Access-Control-Allow-Headers': string;
    'Access-Control-Max-Age': string;
  };
  
  /**
   * NEAR authentication data for the request
   */
  nearAuth?: NearAuthData;
  
  /**
   * Request parameters from URL path
   */
  params?: Record<string, string>;
  
  /**
   * Query parameters from URL
   */
  query?: Record<string, string>;
  
  /**
   * Rate limit headers to be applied to the response
   */
  rateLimitHeaders?: Record<string, string>;
  
  /**
   * Twitter rate limit headers to be applied to the response
   */
  twitterRateLimitHeaders?: Record<string, string>;
  
  /**
   * API key for the request
   */
  apiKey?: ApiKey;
}
