#!/bin/bash
export NODE_ENV=production
export PORT=3000
export HOSTNAME=127.0.0.1
export NODE_OPTIONS='--max-old-space-size=128'

while true; do
  echo "[$(date +%H:%M:%S)] Starting Next.js server..."
  node /home/z/my-project/.next/standalone/server.js &
  SERVER_PID=$!
  
  # Wait for server to be ready
  for i in $(seq 1 20); do
    if curl -s -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; then
      echo "[$(date +%H:%M:%S)] Server ready!"
      break
    fi
    sleep 1
  done
  
  # Wait for server to die
  while kill -0 $SERVER_PID 2>/dev/null; do
    sleep 2
  done
  
  echo "[$(date +%H:%M:%S)] Server died, restarting in 3s..."
  sleep 3
done
