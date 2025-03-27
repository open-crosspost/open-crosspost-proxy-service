/**
 * Example of how to use the Twitter API Proxy from a client application
 */

// Configuration
const API_URL = 'https://twitter-proxy.yourdomain.workers.dev';
const API_KEY = 'your-api-key';
const REDIRECT_URI = 'https://yourdomain.com/callback';

// Initialize authentication
async function initAuth() {
  try {
    const response = await fetch(`${API_URL}/auth/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        redirectUri: REDIRECT_URI,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error initializing auth: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Redirect the user to the Twitter authorization page
    window.location.href = data.authUrl;
  } catch (error) {
    console.error('Error initializing auth:', error);
  }
}

// Handle the callback from Twitter
function handleCallback() {
  // Get the userId from the URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');
  
  if (userId) {
    // Store the userId in localStorage or a secure cookie
    localStorage.setItem('twitterUserId', userId);
    console.log('Authentication successful!');
    
    // Redirect to the home page or dashboard
    window.location.href = '/dashboard';
  } else {
    console.error('Authentication failed: No user ID received');
  }
}

// Post a tweet
async function postTweet(text, mediaIds = []) {
  try {
    const userId = localStorage.getItem('twitterUserId');
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch(`${API_URL}/api/tweet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'X-User-ID': userId,
      },
      body: JSON.stringify({
        text,
        media: mediaIds,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error posting tweet: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Tweet posted successfully:', data);
    return data;
  } catch (error) {
    console.error('Error posting tweet:', error);
    throw error;
  }
}

// Upload media
async function uploadMedia(file) {
  try {
    const userId = localStorage.getItem('twitterUserId');
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const formData = new FormData();
    formData.append('media', file);
    
    const response = await fetch(`${API_URL}/api/media/upload`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'X-User-ID': userId,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Error uploading media: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Media uploaded successfully:', data);
    return data.media_id;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
}

// Get user timeline
async function getUserTimeline(count = 20) {
  try {
    const userId = localStorage.getItem('twitterUserId');
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch(`${API_URL}/api/timeline?count=${count}`, {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'X-User-ID': userId,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error getting timeline: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Timeline retrieved successfully:', data);
    return data;
  } catch (error) {
    console.error('Error getting timeline:', error);
    throw error;
  }
}

// Like a tweet
async function likeTweet(tweetId) {
  try {
    const userId = localStorage.getItem('twitterUserId');
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch(`${API_URL}/api/like/${tweetId}`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'X-User-ID': userId,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error liking tweet: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Tweet liked successfully:', data);
    return data;
  } catch (error) {
    console.error('Error liking tweet:', error);
    throw error;
  }
}

// Revoke authentication
async function revokeAuth() {
  try {
    const userId = localStorage.getItem('twitterUserId');
    
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch(`${API_URL}/auth/revoke`, {
      method: 'DELETE',
      headers: {
        'X-API-Key': API_KEY,
        'X-User-ID': userId,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error revoking auth: ${response.status}`);
    }
    
    // Remove the userId from localStorage
    localStorage.removeItem('twitterUserId');
    
    console.log('Authentication revoked successfully');
  } catch (error) {
    console.error('Error revoking auth:', error);
    throw error;
  }
}

// Example usage in a web application
document.addEventListener('DOMContentLoaded', () => {
  // Check if we're on the callback page
  if (window.location.pathname === '/callback') {
    handleCallback();
    return;
  }
  
  // Check if the user is authenticated
  const userId = localStorage.getItem('twitterUserId');
  
  if (userId) {
    console.log('User is authenticated with ID:', userId);
    
    // Set up event listeners for the tweet form
    const tweetForm = document.getElementById('tweet-form');
    const mediaInput = document.getElementById('media-input');
    
    if (tweetForm) {
      tweetForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const tweetText = document.getElementById('tweet-text').value;
        let mediaIds = [];
        
        // Upload media if selected
        if (mediaInput.files.length > 0) {
          const mediaId = await uploadMedia(mediaInput.files[0]);
          mediaIds.push(mediaId);
        }
        
        // Post the tweet
        await postTweet(tweetText, mediaIds);
        
        // Clear the form
        document.getElementById('tweet-text').value = '';
        mediaInput.value = '';
      });
    }
    
    // Load the user's timeline
    getUserTimeline().then((tweets) => {
      const timelineElement = document.getElementById('timeline');
      
      if (timelineElement) {
        timelineElement.innerHTML = '';
        
        tweets.forEach((tweet) => {
          const tweetElement = document.createElement('div');
          tweetElement.className = 'tweet';
          tweetElement.innerHTML = `
            <p>${tweet.text}</p>
            <button class="like-button" data-tweet-id="${tweet.id}">Like</button>
          `;
          
          timelineElement.appendChild(tweetElement);
        });
        
        // Add event listeners to like buttons
        document.querySelectorAll('.like-button').forEach((button) => {
          button.addEventListener('click', () => {
            const tweetId = button.getAttribute('data-tweet-id');
            likeTweet(tweetId);
          });
        });
      }
    });
    
    // Set up the logout button
    const logoutButton = document.getElementById('logout-button');
    
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        revokeAuth().then(() => {
          window.location.href = '/login';
        });
      });
    }
  } else {
    console.log('User is not authenticated');
    
    // Set up the login button
    const loginButton = document.getElementById('login-button');
    
    if (loginButton) {
      loginButton.addEventListener('click', () => {
        initAuth();
      });
    }
  }
});
