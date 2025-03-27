import { Env } from '../index';
import { ExtendedRequest } from '../types';

/**
 * Validate the API key in the request
 * This middleware checks if the API key is valid and if the origin is allowed
 */
export const validateApiKey = async (request: Request): Promise<Response | void> => {
  // Get the API key from the request headers
  const apiKey = request.headers.get('X-API-Key');
  
  // If no API key is provided, return a 401 Unauthorized response
  if (!apiKey) {
    return new Response('API key is required', { status: 401 });
  }
  
  // Get the environment from the request
  const env = (request as ExtendedRequest).env;
  
  // Parse the API keys from the environment variable
  let apiKeys: Record<string, string[]> = {};
  try {
    apiKeys = JSON.parse(env.API_KEYS || '{}');
  } catch (error) {
    console.error('Error parsing API keys:', error);
    return new Response('Internal server error', { status: 500 });
  }
  
  // Get the origin from the request
  const origin = request.headers.get('Origin') || '';
  
  // Check if the API key is valid and if the origin is allowed
  let isValid = false;
  
  // Loop through the API keys to find a match
  for (const [key, allowedOrigins] of Object.entries(apiKeys)) {
    if (key === apiKey) {
      // If the API key matches, check if the origin is allowed
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        isValid = true;
        break;
      }
    }
  }
  
  // If the API key is not valid or the origin is not allowed, return a 403 Forbidden response
  if (!isValid) {
    return new Response('Invalid API key or origin not allowed', { status: 403 });
  }
  
  // If the API key is valid and the origin is allowed, continue to the next middleware
};

/**
 * Extract the user ID from the request
 * This is used to retrieve the user's tokens from the KV store
 */
export const extractUserId = (request: Request): string => {
  // Get the user ID from the request headers or query parameters
  const userId = request.headers.get('X-User-ID') || 
                new URL(request.url).searchParams.get('userId') || '';
  
  if (!userId) {
    throw new Error('User ID is required');
  }
  
  return userId;
};
