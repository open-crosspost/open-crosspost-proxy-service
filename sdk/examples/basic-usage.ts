/**
 * Basic usage example for the Crosspost SDK
 */
import { apiClient, SupportedPlatform, PostRequest } from '../src/index.ts';

// Example: Set custom options
apiClient.setRequestOptions({
  debug: true,
  timeout: 10000,
});

// Example: Set custom headers
apiClient.setCustomHeaders({
  'X-Custom-Header': 'custom-value',
});

// Example: Connect a platform account using a popup
async function connectAccount() {
  console.log('Connecting a platform account...');
  
  const response = await apiClient.connectPlatformAccount(
    SupportedPlatform.TWITTER,
    'https://your-app.com/callback',
    {
      usePopup: true, // Use a popup window instead of redirecting
      popupFeatures: 'width=600,height=700,left=0,top=0', // Customize popup size and position
      onComplete: (result) => {
        if (result.success) {
          console.log('Authentication completed successfully!');
          // You can fetch accounts or perform other actions here
          fetchAccounts();
        } else {
          console.error('Authentication failed:', result.error);
        }
      }
    }
  );
  
  if (!response.success) {
    console.error('Error initiating connection:', response.error);
  }
}

// Example: Fetch connected accounts
async function fetchAccounts() {
  console.log('Fetching connected accounts...');
  const response = await apiClient.fetchConnectedAccounts();
  
  if (response.success) {
    console.log('Connected accounts:', response.data);
  } else {
    console.error('Error fetching accounts:', response.error);
  }
}

// Example: Create a post
async function createPost() {
  console.log('Creating a post...');
  
  const postRequest: PostRequest = {
    targets: [
      {
        platform: SupportedPlatform.TWITTER,
        userId: 'your-twitter-user-id',
      },
    ],
    content: [
      {
        text: 'Hello world from Crosspost SDK!',
        media: [
          {
            data: 'base64-encoded-image-or-url',
            mimeType: 'image/jpeg',
            altText: 'A beautiful landscape',
          },
        ],
      },
    ],
  };
  
  const response = await apiClient.createPost(postRequest);
  
  if (response.success) {
    console.log('Post created successfully:', response.data);
  } else {
    console.error('Error creating post:', response.error);
  }
}

// Example: Check rate limit status
async function checkRateLimits() {
  console.log('Checking rate limits...');
  const response = await apiClient.getRateLimitStatus();
  
  if (response.success) {
    console.log('Rate limits:', response.data);
  } else {
    console.error('Error checking rate limits:', response.error);
  }
}

// Run the examples
async function runExamples() {
  try {
    // Connect an account first (this will open a popup)
    // await connectAccount();
    
    // Or just fetch existing accounts
    await fetchAccounts();
    
    // Other examples
    // await createPost();
    // await checkRateLimits();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

runExamples();
