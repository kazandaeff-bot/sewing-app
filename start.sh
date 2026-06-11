#!/bin/bash
cd /home/z/my-project
export NODE_ENV=production
export JWT_SECRET=sewing-prod-2026-secure-key-change-on-vps-x9k2m
export DATABASE_URL=file:/home/z/my-project/db/custom.db

# Kill any existing server
pkill -f "next-server" 2>/dev/null
pkill -f "standalone/server" 2>/dev/null
sleep 1

# Use double-fork + setsid to keep process alive in K8s
# This ensures the process is adopted by PID 1 (tini) and won't be killed
(setsid node .next/standalone/server.js -p 3000 -H 0.0.0.0 > server.log 2>&1 &)

sleep 3

# Verify
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ | grep -q "200"; then
  echo "✓ Server started successfully on port 3000"
else
  echo "✗ Server may not have started, check server.log"
  cat server.log 2>/dev/null
fi
