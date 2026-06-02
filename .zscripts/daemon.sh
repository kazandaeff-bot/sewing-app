#!/bin/bash
cd /home/z/my-project
export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0

# Ensure static files exist
if [ ! -d ".next/standalone/.next/static" ]; then
  mkdir -p .next/standalone/.next
  cp -r .next/static .next/standalone/.next/static
fi

# Kill any existing server on port 3000
fuser -k 3000/tcp 2>/dev/null || true
sleep 1

# Double-fork to detach from parent process
(while true; do
  node .next/standalone/server.js >> /tmp/server-daemon.log 2>&1
  echo "[$(date)] Server exited, restarting in 2s..." >> /tmp/server-daemon.log
  sleep 2
done) &
