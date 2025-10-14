// Simple functionality test for the Crosspost plugin
import { createLocalPluginRuntime } from 'every-plugin/testing';
import CrosspostPlugin from './src/index.js';

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

async function testPluginFunctionality() {
  console.log('🧪 Testing Crosspost Plugin Functionality\n');
  
  try {
    // 1. Create plugin runtime
    console.log('1️⃣ Creating plugin runtime...');
    const runtime = createLocalPluginRuntime({
      registry: {
        '@crosspost/plugin': {
          remoteUrl: 'http://localhost:3000/remoteEntry.js',
          version: '1.0.0'
        }
      }
    }, {
      '@crosspost/plugin': CrosspostPlugin
    });
    
    // 2. Configure plugin
    console.log('2️⃣ Configuring plugin...');
    const config = {
      variables: {
        baseUrl: 'https://api.opencrosspost.com',
        timeout: 5000
      },
      secrets: {
        nearAuthData: JSON.stringify({
          account_id: 'test.near',
          public_key: 'ed25519:test',
          signature: 'test-signature',
          message: 'test-message',
          nonce: new Array(32).fill(0).map((_, i) => i),
          recipient: 'crosspost.near'
        })
      }
    };
    
    // 3. Initialize plugin
    console.log('3️⃣ Initializing plugin...');
    const { client, initialized } = await runtime.usePlugin('@crosspost/plugin', config);
    console.log('✅ Plugin initialized:', initialized.plugin.id);
    
    // 4. Test health check
    console.log('\n4️⃣ Testing health check...');
    const health = await client.system.getHealthStatus();
    console.log('✅ Health status:', health);
    
    // 5. Test NEAR authorization
    console.log('\n5️⃣ Testing NEAR authorization...');
    const authResult = await client.auth.authorizeNearAccount();
    console.log('✅ Authorization result:', authResult);
    
    // 6. Test getting connected accounts
    console.log('\n6️⃣ Testing connected accounts...');
    const accounts = await client.auth.getConnectedAccounts();
    console.log('✅ Connected accounts:', accounts);
    
    // 7. Test creating a post
    console.log('\n7️⃣ Testing post creation...');
    const postResult = await client.post.create({
      targets: [{ platform: 'twitter', userId: '123456' }],
      content: [{ text: 'Hello from Crosspost plugin!' }]
    });
    console.log('✅ Post creation result:', postResult);
    
    // 8. Test getting rate limits
    console.log('\n8️⃣ Testing rate limits...');
    const rateLimits = await client.system.getRateLimits();
    console.log('✅ Rate limits:', rateLimits);
    
    console.log('\n🎉 All functionality tests passed! The plugin is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testPluginFunctionality();
