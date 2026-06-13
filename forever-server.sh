#!/bin/bash
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0
export NODE_OPTIONS="--max-old-space-size=512"

while true; do
  echo "[$(date +%H:%M:%S)] Starting server..."
  node run-robust.js 2>&1
  EXIT=$?
  echo "[$(date +%H:%M:%S)] Server exited (code=$EXIT), restarting in 2s..."
  sleep 2
done
