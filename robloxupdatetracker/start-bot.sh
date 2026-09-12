#!/bin/bash
# Build + start Roblox Update Tracker bot - Linux version
set -e
cd "$(dirname "$0")"
echo "Building Roblox Update Tracker..."
npm run build
echo ""
echo "Starting Roblox Update Tracker bot..."
node dist/index.js
