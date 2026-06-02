#!/bin/bash
# Persistent server runner with auto-restart
cd /home/z/my-project

while true; do
  echo "[$(date)] Starting server..."
  NODE_ENV=production node --max-old-space-size=512 server.js
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done
