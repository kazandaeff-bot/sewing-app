#!/bin/bash
# Keep-alive script for the sewing production platform
# This script ensures the server is always running

LOG=/tmp/server-keepalive.log
PORT=3000

while true; do
  # Check if server is responding
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ 2>/dev/null | grep -q "200"; then
    # Server is alive, just wait
    sleep 10
    continue
  fi
  
  # Server is not responding, start it
  echo "[$(date)] Server not responding, starting..." >> $LOG
  
  # Kill any existing processes on port 3000
  fuser -k $PORT/tcp 2>/dev/null
  sleep 1
  
  # Start server
  cd /home/z/my-project
  export NODE_ENV=production
  node --max-old-space-size=256 server.js >> $LOG 2>&1 &
  SERVER_PID=$!
  
  # Wait for server to be ready
  for i in $(seq 1 20); do
    sleep 1
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ 2>/dev/null | grep -q "200"; then
      echo "[$(date)] Server started (PID: $SERVER_PID)" >> $LOG
      break
    fi
  done
  
  # Wait for the server process to die
  wait $SERVER_PID 2>/dev/null
  echo "[$(date)] Server process exited, restarting in 3s..." >> $LOG
  sleep 3
done
