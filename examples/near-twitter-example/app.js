// NEAR Twitter Integration Example App

// Constants
const TWITTER_AUTH_STORAGE_KEY = 'twitter-auth-data';
const API_BASE_URL = 'http://localhost:3000'; // Twitter proxy service URL
const SAMPLE_APP_URL = 'http://localhost:4000'; // This app's URL
const API_KEY = 'test-api-key'; // Replace with your actual API key

// Initialize NEAR
near.config({ networkId: 'mainnet' });

// DOM Elements
const connectTwitterBtn = document.getElementById('connect-twitter');
const postTweetBtn = document.getElementById('post-tweet');
const tweetTextArea = document.getElementById('tweet-text');
const nearIndicator = document.getElementById('near-indicator');
const twitterIndicator = document.getElementById('twitter-indicator');
const nearAccountSpan = document.getElementById('near-account');
const twitterAccountSpan = document.getElementById('twitter-account');
const statusElement = document.getElementById('status');

// State
let currentAccount = near.accountId();
let twitterAuthData = null;

// Initialize the app
function initApp() {
    // Load Twitter auth data
    loadTwitterAuthData();
    
    // Set up event listeners
    connectTwitterBtn.addEventListener('click', connectTwitter);
    postTweetBtn.addEventListener('click', postTweet);
    tweetTextArea.addEventListener('input', validateForm);
    
    // Check URL for Twitter OAuth callback
    checkTwitterCallback();
    
    // Setup account handling
    near.event.onAccount((accountId) => {
        console.log("Account ID Update", accountId);
        currentAccount = accountId;
        updateUI();
    });
    
    // Update UI based on connection status
    updateUI();
}

// Load saved Twitter authentication data
function loadTwitterAuthData() {
    const twitterAuthString = localStorage.getItem(TWITTER_AUTH_STORAGE_KEY);
    if (twitterAuthString) {
        try {
            twitterAuthData = JSON.parse(twitterAuthString);
            console.log('Loaded Twitter auth data:', twitterAuthData);
        } catch (e) {
            console.error('Error parsing Twitter auth data:', e);
        }
    }
}

// Update UI based on connection status
function updateUI() {
    // Update NEAR connection status
    if (currentAccount) {
        nearIndicator.classList.remove('disconnected');
        nearIndicator.classList.add('connected');
        nearAccountSpan.textContent = currentAccount;
        updateStatus(`Connected as: ${currentAccount}`);
    } else {
        nearIndicator.classList.remove('connected');
        nearIndicator.classList.add('disconnected');
        nearAccountSpan.textContent = 'Not connected';
        updateStatus('Not connected to NEAR');
    }
    
    // Update Twitter connection status
    if (twitterAuthData && twitterAuthData.userId) {
        twitterIndicator.classList.remove('disconnected');
        twitterIndicator.classList.add('connected');
        twitterAccountSpan.textContent = twitterAuthData.username || twitterAuthData.userId;
    } else {
        twitterIndicator.classList.remove('connected');
        twitterIndicator.classList.add('disconnected');
        twitterAccountSpan.textContent = 'Not connected';
    }
    
    // Update post button state
    validateForm();
}

// Validate form and enable/disable post button
function validateForm() {
    const tweetText = tweetTextArea.value.trim();
    const isNearConnected = !!currentAccount;
    const isTwitterConnected = !!(twitterAuthData && twitterAuthData.userId);
    
    postTweetBtn.disabled = !(tweetText && isNearConnected && isTwitterConnected);
}

// Update status message
function updateStatus(message, type = '') {
    statusElement.textContent = message;
    
    // Reset classes
    statusElement.classList.remove('success', 'error', 'info');
    
    // Add type class if provided
    if (type) {
        statusElement.classList.add(type);
    }
}

// Sign in function
function signIn() {
    near.requestSignIn({ contractId: 'twitter-proxy.near' });
}

// Sign out function
function signOut() {
    near.signOut();
    currentAccount = null;
    updateUI();
}

// Connect to Twitter
async function connectTwitter() {
    try {
        // Check if NEAR is connected
        if (!currentAccount) {
            updateStatus('Please sign in with NEAR first', 'error');
            return;
        }
        
        updateStatus('Initializing Twitter authentication...', 'info');
        
        // Create a message to sign
        const message = `Connect Twitter account to ${currentAccount}`;
        const nonce = Date.now().toString();
        
        try {
            // Sign the message with NEAR
            const signResult = await near.signMessage({
                message,
                nonce: new TextEncoder().encode(nonce.padStart(32, "0")),
                recipient: 'twitter-proxy.near',
                callbackUrl: window.location.href
            });
            
            // Create auth object
            const authObject = {
                accountId: signResult.accountId,
                publicKey: signResult.publicKey,
                signature: signResult.signature,
                message: message,
                nonce: nonce,
                recipient: 'crosspost.near',
                callback_url: window.location.href
            };
            
            // Initialize Twitter OAuth flow with NEAR signature
            const response = await fetch(`${API_BASE_URL}/auth/init-with-near`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY,
                    'Authorization': `Bearer ${JSON.stringify(authObject)}`
                },
                body: JSON.stringify({
                    returnUrl: SAMPLE_APP_URL
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            const data = await response.json();
            
            // Store state for verification
            localStorage.setItem('twitter-oauth-state', data.data.state);
            
            // Redirect to Twitter auth URL
            window.location.href = data.data.authUrl;
        } catch (error) {
            console.error('Error signing message:', error);
            updateStatus('Error signing message: ' + error.message, 'error');
        }
    } catch (error) {
        console.error('Error connecting to Twitter:', error);
        updateStatus('Error connecting to Twitter: ' + error.message, 'error');
    }
}

// Check for Twitter OAuth callback
function checkTwitterCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for success or error from the proxy service
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const error_description = urlParams.get('error_description');
    
    // Check for NEAR account ID
    const nearAccountId = urlParams.get('nearAccountId');
    const userId = urlParams.get('userId');
    
    // Check for direct Twitter callback parameters
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    // Handle error case
    if (error) {
        updateStatus(`Twitter authentication failed: ${error}${error_description ? ` - ${error_description}` : ''}`, 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }
    
    // Handle success case with NEAR authentication
    if (success === 'true' && nearAccountId && userId) {
        // Save Twitter auth data (minimal info since tokens are stored on the server)
        twitterAuthData = {
            userId,
            nearAccountId
        };
        
        localStorage.setItem(TWITTER_AUTH_STORAGE_KEY, JSON.stringify(twitterAuthData));
        
        updateStatus('Successfully connected to Twitter!', 'success');
        updateUI();
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }
    
    // Handle legacy direct Twitter callback
    if (code && state) {
        // Get saved state
        const savedState = localStorage.getItem('twitter-oauth-state');
        
        if (state === savedState) {
            // Handle the callback
            handleLegacyTwitterCallback(code, state);
        } else {
            updateStatus('Twitter authentication failed: State mismatch', 'error');
        }
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Handle legacy Twitter OAuth callback (without NEAR)
async function handleLegacyTwitterCallback(code, state) {
    try {
        updateStatus('Completing Twitter authentication...', 'info');
        
        const savedState = localStorage.getItem('twitter-oauth-state');
        
        // Complete OAuth flow
        const response = await fetch(`${API_BASE_URL}/api/twitter/callback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
            },
            body: JSON.stringify({
                code,
                state,
                savedState,
                redirectUri: window.location.href,
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        
        // Save Twitter auth data
        twitterAuthData = {
            userId: data.data.userId,
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
            expiresAt: data.data.expiresAt
        };
        
        localStorage.setItem(TWITTER_AUTH_STORAGE_KEY, JSON.stringify(twitterAuthData));
        
        updateStatus('Successfully connected to Twitter!', 'success');
        updateUI();
    } catch (error) {
        console.error('Error handling Twitter callback:', error);
        updateStatus('Error completing Twitter authentication: ' + error.message, 'error');
    }
}

// Post a tweet using NEAR signature for authentication
async function postTweet() {
    try {
        const tweetText = tweetTextArea.value.trim();
        
        if (!tweetText) {
            updateStatus('Please enter some text for your tweet', 'error');
            return;
        }
        
        if (!currentAccount) {
            updateStatus('Please sign in with NEAR first', 'error');
            return;
        }
        
        if (!twitterAuthData || !twitterAuthData.userId) {
            updateStatus('Please connect your Twitter account first', 'error');
            return;
        }
        
        updateStatus('Signing message...', 'info');
        
        // Sign the message with NEAR
        try {
            // Create a message to sign
            const message = `Post tweet: ${tweetText}`;
            const nonce = Date.now().toString();
            
            // Sign the message
            const signResult = await near.signMessage({
                message,
                nonce: new TextEncoder().encode(nonce.padStart(32, "0")),
                recipient: 'twitter-proxy.near',
                callbackUrl: window.location.href
            });
            
            updateStatus('Posting tweet...', 'info');
            
            // Create auth object
            const authObject = {
                accountId: signResult.accountId,
                publicKey: signResult.publicKey,
                signature: signResult.signature,
                message: message,
                nonce: nonce,
                recipient: 'crosspost.near',
                callback_url: window.location.href
            };
            
            // Create the request to post a tweet
            const response = await fetch(`${API_BASE_URL}/api/post/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY,
                    'X-User-ID': twitterAuthData.userId,
                    'Authorization': `Bearer ${JSON.stringify(authObject)}`
                },
                body: JSON.stringify({
                    text: tweetText
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP error ${response.status}`);
            }
            
            const data = await response.json();
            
            updateStatus('Tweet posted successfully!', 'success');
            
            // Clear the tweet text
            tweetTextArea.value = '';
            validateForm();
        } catch (error) {
            console.error('Error signing message:', error);
            updateStatus('Error signing message: ' + error.message, 'error');
        }
    } catch (error) {
        console.error('Error posting tweet:', error);
        updateStatus('Error posting tweet: ' + error.message, 'error');
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
