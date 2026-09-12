#!/bin/bash
# Stop both projects - Linux version
cd "$(dirname "$0")"
pm2 delete steal-dash roblox-bot || true
pm2 save
pm2 list
