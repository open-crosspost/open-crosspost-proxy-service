/**
 * Environment configuration
 * Defines the environment variables and bindings used by the application
 */

export interface Env {
  // Cloudflare bindings
  TOKENS: KVNamespace;
  DB: D1Database;
  
  // Twitter API credentials
  TWITTER_CLIENT_ID: string;
  TWITTER_CLIENT_SECRET: string;
  TWITTER_API_KEY: string;
  TWITTER_API_SECRET: string;
  TWITTER_ACCESS_TOKEN: string;
  TWITTER_ACCESS_SECRET: string;
  
  // Security
  ENCRYPTION_KEY: string;
  ALLOWED_ORIGINS: string;
  API_KEYS: string;
  
  // Environment
  ENVIRONMENT: string;
  
  // Optional
  REDIS_URL?: string;
  
  // Upstash Redis
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

/**
 * Get allowed origins from environment variable
 * @param env The environment object
 * @returns Array of allowed origins
 */
export function getAllowedOrigins(env: Env): string[] {
  try {
    return env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  } catch (error) {
    console.error('Error parsing ALLOWED_ORIGINS:', error);
    return [];
  }
}

/**
 * Get API keys from environment variable
 * @param env The environment object
 * @returns Map of API keys to allowed origins
 */
export function getApiKeys(env: Env): Map<string, string[]> {
  try {
    const apiKeysMap = new Map<string, string[]>();
    const apiKeys = JSON.parse(env.API_KEYS);
    
    for (const [key, origins] of Object.entries(apiKeys)) {
      apiKeysMap.set(key, origins as string[]);
    }
    
    return apiKeysMap;
  } catch (error) {
    console.error('Error parsing API_KEYS:', error);
    return new Map();
  }
}

/**
 * Check if the environment is production
 * @param env The environment object
 * @returns True if the environment is production
 */
export function isProduction(env: Env): boolean {
  return env.ENVIRONMENT === 'production';
}

/**
 * Check if the environment is staging
 * @param env The environment object
 * @returns True if the environment is staging
 */
export function isStaging(env: Env): boolean {
  return env.ENVIRONMENT === 'staging';
}

/**
 * Check if the environment is development
 * @param env The environment object
 * @returns True if the environment is development
 */
export function isDevelopment(env: Env): boolean {
  return env.ENVIRONMENT === 'development';
}
