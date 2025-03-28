#!/bin/bash
# Install dependencies and generate lock file

echo "Installing dependencies for Deno tests..."

# Create node_modules directory and install dependencies
deno cache --reload --node-modules-dir --lock=deno.lock --lock-write .

echo "Dependencies installed and lock file generated."
echo "You can now run the tests with ./run-all-tests.sh"
