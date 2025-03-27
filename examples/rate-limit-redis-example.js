/**
 * Example demonstrating how to use the Twitter API Proxy with rate limit tracking and Redis caching
 * 
 * This example shows:
 * 1. How to make requests through the proxy
 * 2. How to check rate limit status
 * 3. How to benefit from Redis caching for repeated requests
 */

// Replace with your actual API key and user ID
const API_KEY = 'your_api_key';
const USER_ID = 'user_id_from_auth_flow';

// Replace with your actual proxy URL
const PROXY_URL = 'https://your-twitter-proxy.workers.dev';

// Example function to get a user's profile
async function getUserProfile() {
  try {
    const response = await fetch(`${PROXY_URL}/api/user/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-User-ID': USER_ID
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error fetching user profile:', errorData);
      
      // Check if we hit a rate limit
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        console.log(`Rate limit hit. Retry after ${retryAfter} seconds.`);
      }
      
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}

// Example function to check rate limit status for an endpoint
async function checkRateLimit(endpoint) {
  try {
    const response = await fetch(`${PROXY_URL}/api/rate-limit?endpoint=${encodeURIComponent(endpoint)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-User-ID': USER_ID
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error checking rate limit:', errorData);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}

// Example demonstrating the benefit of Redis caching
async function demonstrateCaching() {
  console.log('Making first request (will hit Twitter API)...');
  console.time('First request');
  const firstResult = await getUserProfile();
  console.timeEnd('First request');
  
  console.log('Making second request (should be served from Redis cache)...');
  console.time('Second request');
  const secondResult = await getUserProfile();
  console.timeEnd('Second request');
  
  console.log('First and second responses are identical:', 
    JSON.stringify(firstResult) === JSON.stringify(secondResult));
  
  // Check rate limit status
  const rateLimitStatus = await checkRateLimit('users/me');
  console.log('Current rate limit status:', rateLimitStatus);
}

// Run the demonstration
demonstrateCaching().catch(console.error);
