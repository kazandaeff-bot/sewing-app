#!/bin/bash
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0
export NODE_OPTIONS="--max-old-space-size=128"

ATTEMPT=0
while true; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "[$(date +%H:%M:%S)] Starting server (attempt $ATTEMPT)..." >> /tmp/smart-server.log
  node run-robust.js >> /tmp/smart-server.log 2>&1
  EXIT=$?
  echo "[$(date +%H:%M:%S)] Server exited (code=$EXIT)" >> /tmp/smart-server.log
  
  # After many restarts, rebuild
  if [ $ATTEMPT -gt 50 ]; then
    echo "[$(date +%H:%M:%S)] Too many restarts, rebuilding..." >> /tmp/smart-server.log
    npx next build >> /tmp/smart-server.log 2>&1
    ATTEMPT=0
  fi
  
  sleep 1
done
