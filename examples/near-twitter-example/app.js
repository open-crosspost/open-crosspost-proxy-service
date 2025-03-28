// NEAR Twitter Integration Example App

// Constants
const TWITTER_AUTH_STORAGE_KEY = 'twitter-auth-data';
const API_BASE_URL = 'http://localhost:8787'; // Replace with your actual API URL

// Initialize NEAR
near.config({ networkId: 'testnet' });

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
        updateStatus('Initializing Twitter authentication...', 'info');
        
        // Initialize Twitter OAuth flow
        const response = await fetch(`${API_BASE_URL}/auth/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                redirectUri: window.location.href,
                scopes: ['tweet.read', 'tweet.write', 'users.read']
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
        console.error('Error connecting to Twitter:', error);
        updateStatus('Error connecting to Twitter: ' + error.message, 'error');
    }
}

// Check for Twitter OAuth callback
function checkTwitterCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
        // Get saved state
        const savedState = localStorage.getItem('twitter-oauth-state');
        
        if (state === savedState) {
            // Handle the callback
            handleTwitterCallback(code, state);
        } else {
            updateStatus('Twitter authentication failed: State mismatch', 'error');
        }
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Handle Twitter OAuth callback
async function handleTwitterCallback(code, state) {
    try {
        updateStatus('Completing Twitter authentication...', 'info');
        
        const savedState = localStorage.getItem('twitter-oauth-state');
        
        // Complete OAuth flow
        const response = await fetch(`${API_BASE_URL}/auth/callback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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
            username: data.data.username,
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
            
            // Create the request to post a tweet
            const response = await fetch(`${API_BASE_URL}/api/post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': twitterAuthData.userId,
                    'X-Near-Account-Id': signResult.accountId,
                    'X-Near-Public-Key': signResult.publicKey,
                    'X-Near-Signature': signResult.signature,
                    'X-Near-Message': message,
                    'X-Near-Nonce': nonce
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
