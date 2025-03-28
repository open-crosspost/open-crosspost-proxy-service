import 'jsr:@std/dotenv/load';

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
    TWITTER_CLIENT_ID: Deno.env.get('TWITTER_CLIENT_ID') || '',
    TWITTER_CLIENT_SECRET: Deno.env.get('TWITTER_CLIENT_SECRET') || '',
    TWITTER_API_KEY: Deno.env.get('TWITTER_API_KEY') || '',
    TWITTER_API_SECRET: Deno.env.get('TWITTER_API_SECRET') || '',
    TWITTER_ACCESS_TOKEN: Deno.env.get('TWITTER_ACCESS_TOKEN') || '',
    TWITTER_ACCESS_SECRET: Deno.env.get('TWITTER_ACCESS_SECRET') || '',
    ENCRYPTION_KEY: Deno.env.get('ENCRYPTION_KEY') || 'default-encryption-key',
    ALLOWED_ORIGINS: Deno.env.get('ALLOWED_ORIGINS') || '',
    ENVIRONMENT: Deno.env.get('ENVIRONMENT') || 'development',
    UPSTASH_REDIS_REST_URL: Deno.env.get('UPSTASH_REDIS_REST_URL'),
    UPSTASH_REDIS_REST_TOKEN: Deno.env.get('UPSTASH_REDIS_REST_TOKEN'),
  };
}

/**
 * Get allowed origins from environment variable
 * @returns Array of allowed origins
 */
export function getAllowedOrigins(): string[] {
  try {
    const env = getEnv();
    return env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
  } catch (error) {
    console.error('Error parsing ALLOWED_ORIGINS:', error);
    return [];
  }
}

/**
 * Check if the environment is production
 * @returns True if the environment is production
 */
export function isProduction(): boolean {
  const env = getEnv();
  return env.ENVIRONMENT === 'production';
}

/**
 * Check if the environment is staging
 * @returns True if the environment is staging
 */
export function isStaging(): boolean {
  const env = getEnv();
  return env.ENVIRONMENT === 'staging';
}

/**
 * Check if the environment is development
 * @returns True if the environment is development
 */
export function isDevelopment(): boolean {
  const env = getEnv();
  return env.ENVIRONMENT === 'development';
}

/**
 * Validate environment configuration for security
 * @param env Environment configuration
 * @returns Validation result with warnings and errors
 */
export function validateSecurityConfig(env: Env): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check encryption key
  if (env.ENCRYPTION_KEY === 'default-encryption-key') {
    if (isProduction() || isStaging()) {
      errors.push('Default encryption key used in production/staging environment');
    } else {
      warnings.push('Default encryption key used - not secure for production');
    }
  }

  // Check encryption key length
  const keyLength = new TextEncoder().encode(env.ENCRYPTION_KEY).length;
  if (keyLength < 16) {
    errors.push(`Encryption key too short (${keyLength} bytes). Minimum 16 bytes required.`);
  }

  // Check allowed origins
  if (!env.ALLOWED_ORIGINS && (isProduction() || isStaging())) {
    errors.push('No ALLOWED_ORIGINS specified in production/staging environment');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Get environment variables with validation
 * @param enforceSecure Whether to enforce secure configuration
 * @returns Environment variables
 * @throws Error if enforceSecure is true and configuration is insecure
 */
export function getSecureEnv(enforceSecure = false): Env {
  const env = getEnv();
  const validation = validateSecurityConfig(env);

  // Log warnings
  validation.warnings.forEach((warning) => {
    console.warn(`[Security Warning] ${warning}`);
  });

  // Log or throw errors
  if (!validation.isValid) {
    const errorMessage = `Security configuration errors:\n${validation.errors.join('\n')}`;

    if (enforceSecure) {
      throw new Error(errorMessage);
    } else {
      console.error(errorMessage);
    }
  }

  return env;
}
