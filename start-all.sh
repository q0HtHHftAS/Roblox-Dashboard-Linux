#!/bin/bash
# Run both projects with PM2 (steal-dash + roblox-bot) - Linux version
set -e
cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:/usr/bin:/bin:$PATH"
pm2 startOrReload ecosystem.config.js
pm2 save
pm2 list
echo ""
echo "Done: steal-dash (port 3000) + roblox-bot running."
