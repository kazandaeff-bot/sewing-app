#!/bin/bash
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0
export NODE_ENV=production

while true; do
  node .next/standalone/server.js &
  NODE_PID=$!
  
  # Keep checking every 5 seconds
  while kill -0 $NODE_PID 2>/dev/null; do
    sleep 5
  done
  
  echo "[$(date)] Node died, restarting..." >> alive.log
  sleep 2
done
