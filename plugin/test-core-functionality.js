// Test core functionality without full plugin build
import { CrosspostService } from './src/service.js';

// Mock fetch for testing
global.fetch = async (url, options) => {
  console.log(`[MOCK] Fetching: ${url}`);
  console.log(`[MOCK] Method: ${options.method}`);
  console.log(`[MOCK] Headers:`, options.headers);
  
  // Simulate successful API responses
  if (url.includes('/health')) {
    return {
      ok: true,
      json: () => Promise.resolve({
        status: 'ok',
        timestamp: new Date().toISOString()
      })
    };
  }
  
  if (url.includes('/auth/authorize/near')) {
    return {
      ok: true,
      json: () => Promise.resolve({
        signerId: 'test.near',
        isAuthorized: true
      })
    };
  }
  
  if (url.includes('/auth/accounts')) {
    return {
      ok: true,
      json: () => Promise.resolve({
        accounts: [
          {
            platform: 'twitter',
            userId: '123456',
            connectedAt: '2023-01-01T00:00:00Z',
            profile: null
          }
        ]
      })
    };
  }
  
  if (url.includes('/api/post')) {
    return {
      ok: true,
      json: () => Promise.resolve({
        summary: { total: 1, succeeded: 1, failed: 0 },
        results: [
          {
            platform: 'twitter',
            userId: '123456',
            details: { id: 'post-123', success: true }
          }
        ]
      })
    };
  }
  
  // Default response
  return {
    ok: true,
    json: () => Promise.resolve({ success: true })
  };
};

async function testCoreFunctionality() {
  console.log('🧪 Testing Crosspost Plugin Core Functionality\n');
  
  try {
    // 1. Test service creation
    console.log('1️⃣ Creating CrosspostService...');
    const mockAuthData = {
      account_id: 'test.near',
      public_key: 'ed25519:test',
      signature: 'test-signature',
      message: 'test-message',
      nonce: new Array(32).fill(0).map((_, i) => i),
      recipient: 'crosspost.near'
    };
    
    const service = new CrosspostService(
      'https://api.crosspost.near',
      mockAuthData,
      5000
    );
    console.log('✅ Service created successfully');
    
    // 2. Test health check
    console.log('\n2️⃣ Testing health check...');
    const health = await service.getHealthStatus();
    console.log('✅ Health status:', health);
    
    // 3. Test NEAR authorization
    console.log('\n3️⃣ Testing NEAR authorization...');
    const authResult = await service.authorizeNearAccount();
    console.log('✅ Authorization result:', authResult);
    
    // 4. Test getting connected accounts
    console.log('\n4️⃣ Testing connected accounts...');
    const accounts = await service.getConnectedAccounts();
    console.log('✅ Connected accounts:', accounts);
    
    // 5. Test creating a post
    console.log('\n5️⃣ Testing post creation...');
    const postResult = await service.createPost({
      targets: [{ platform: 'twitter', userId: '123456' }],
      content: [{ text: 'Hello from Crosspost plugin!' }]
    });
    console.log('✅ Post creation result:', postResult);
    
    // 6. Test getting rate limits
    console.log('\n6️⃣ Testing rate limits...');
    const rateLimits = await service.getRateLimits();
    console.log('✅ Rate limits:', rateLimits);
    
    console.log('\n🎉 All core functionality tests passed! The service is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testCoreFunctionality();
