#!/bin/bash
set -e

cd /home/z/my-project

# Install dependencies
echo "[DEV] Installing dependencies..."
bun install

# Set up database
echo "[DEV] Setting up database..."
bun run db:push

# Build production server
echo "[DEV] Building production server..."
npx next build

# Start production server with auto-restart
echo "[DEV] Starting production server with auto-restart..."
export NODE_ENV=production
export PORT=3000
export HOSTNAME=127.0.0.1
export NODE_OPTIONS="--max-old-space-size=256"

while true; do
  echo "[$(date +%H:%M:%S)] Starting Next.js production server..."
  npx next start -p 3000 -H 127.0.0.1
  EXIT=$?
  echo "[$(date +%H:%M:%S)] Server exited (code=$EXIT), restarting in 3s..."
  sleep 3
done
