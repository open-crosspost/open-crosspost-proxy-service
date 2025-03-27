import { Env } from '../index';
import { ExtendedRequest } from '../types';

/**
 * Handle CORS preflight requests and add CORS headers to all responses
 */
export const handleCors = (request: Request): Response | void => {
  // Get allowed origins from environment variable
  const env = (request as ExtendedRequest).env;
  const allowedOrigins = env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : [];
  
  // Get the request origin
  const origin = request.headers.get('Origin') || '';
  
  // Check if the origin is allowed
  const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');
  
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
  };
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  
  // For actual requests, add CORS headers to the response
  // This is a middleware, so we don't return a response here
  // Instead, we add the headers to the request object for later use
  (request as ExtendedRequest).corsHeaders = corsHeaders;
};

/**
 * Add CORS headers to a response
 */
export const addCorsHeaders = (response: Response, request: Request): Response => {
  const corsHeaders = (request as ExtendedRequest).corsHeaders || {};
  
  // Create a new response with the CORS headers
  const newResponse = new Response(response.body, response);
  
  // Add CORS headers to the response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value as string);
  });
  
  return newResponse;
};
