import "jsr:@std/dotenv/load";

/**
 * Environment configuration for Deno
 * Defines the environment variables used by the application
 */

export interface Env {
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
  
  // Environment
  ENVIRONMENT: string;
  
  // Optional
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  
  // Deno KV bindings
  TOKENS?: {
    put: (key: string, value: string) => Promise<void>;
    get: (key: string) => Promise<string | null>;
    delete: (key: string) => Promise<void>;
  };
}

/**
 * Get environment variables
 * @returns Environment variables
 */
export function getEnv(): Env {
  return {
    TWITTER_CLIENT_ID: Deno.env.get("TWITTER_CLIENT_ID") || "",
    TWITTER_CLIENT_SECRET: Deno.env.get("TWITTER_CLIENT_SECRET") || "",
    TWITTER_API_KEY: Deno.env.get("TWITTER_API_KEY") || "",
    TWITTER_API_SECRET: Deno.env.get("TWITTER_API_SECRET") || "",
    TWITTER_ACCESS_TOKEN: Deno.env.get("TWITTER_ACCESS_TOKEN") || "",
    TWITTER_ACCESS_SECRET: Deno.env.get("TWITTER_ACCESS_SECRET") || "",
    ENCRYPTION_KEY: Deno.env.get("ENCRYPTION_KEY") || "default-encryption-key",
    ALLOWED_ORIGINS: Deno.env.get("ALLOWED_ORIGINS") || "",
    ENVIRONMENT: Deno.env.get("ENVIRONMENT") || "development",
    UPSTASH_REDIS_REST_URL: Deno.env.get("UPSTASH_REDIS_REST_URL"),
    UPSTASH_REDIS_REST_TOKEN: Deno.env.get("UPSTASH_REDIS_REST_TOKEN"),
  };
}

/**
 * Get allowed origins from environment variable
 * @returns Array of allowed origins
 */
export function getAllowedOrigins(): string[] {
  try {
    const env = getEnv();
    return env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim());
  } catch (error) {
    console.error("Error parsing ALLOWED_ORIGINS:", error);
    return [];
  }
}

/**
 * Check if the environment is production
 * @returns True if the environment is production
 */
export function isProduction(): boolean {
  const env = getEnv();
  return env.ENVIRONMENT === "production";
}

/**
 * Check if the environment is staging
 * @returns True if the environment is staging
 */
export function isStaging(): boolean {
  const env = getEnv();
  return env.ENVIRONMENT === "staging";
}

/**
 * Check if the environment is development
 * @returns True if the environment is development
 */
export function isDevelopment(): boolean {
  const env = getEnv();
  return env.ENVIRONMENT === "development";
}
