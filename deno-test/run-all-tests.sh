#!/bin/bash
# Run all Deno compatibility tests

echo "===== Running Deno Compatibility Tests for Twitter API Proxy ====="
echo ""

# Check if Deno is installed
if ! command -v deno &> /dev/null; then
    echo "Error: Deno is not installed or not in PATH"
    echo "Please install Deno: https://deno.land/#installation"
    exit 1
fi

echo "Deno version: $(deno --version | head -n 1)"
echo ""

# Install npm dependencies
echo "===== Installing npm dependencies ====="
./install-deps.sh
echo ""

# Run basic Twitter API test
echo "===== Running Basic Twitter API Test ====="
deno task test:api
echo ""

# Run Twitter API plugins test
echo "===== Running Twitter API Plugins Test ====="
deno task test:plugins
echo ""

# Run Twitter API Redis plugin test
echo "===== Running Twitter API Redis Plugin Test ====="
deno task test:redis
echo ""

# Run Deno KV token storage test
echo "===== Running Deno KV Token Storage Test ====="
deno task test:kv
echo ""

echo "===== All tests completed ====="
echo ""
echo "To run the Twitter Proxy Server example:"
echo "deno run --allow-net --allow-env twitter-proxy-server.ts"
echo ""
echo "Then visit:"
echo "- http://localhost:8000/ - Server info"
echo "- http://localhost:8000/auth/twitter - Get Twitter auth URL"
echo "- http://localhost:8000/api/me?userId=[userId] - Get user info (requires authentication)"
