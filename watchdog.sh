#!/bin/bash
# Watchdog script that keeps the server running
# Restarts within 2 seconds if it crashes

PORT=3000
LOG=/tmp/next-server.log
WATCHDOG_LOG=/tmp/watchdog.log

echo "[$(date)] Watchdog starting..." > $WATCHDOG_LOG

while true; do
  # Check if server is already running
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ 2>/dev/null | grep -q "200"; then
    # Server is healthy, wait and check again
    sleep 5
    continue
  fi

  echo "[$(date)] Server not responding, (re)starting..." >> $WATCHDOG_LOG

  # Kill any remaining processes
  pkill -f "server.js.*$PORT" 2>/dev/null
  sleep 1

  # Start the server
  cd /home/z/my-project
  node .next/standalone/server.js -p $PORT >> $LOG 2>&1 &

  # Wait for it to come up
  for i in $(seq 1 10); do
    sleep 1
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ 2>/dev/null | grep -q "200"; then
      echo "[$(date)] Server started successfully" >> $WATCHDOG_LOG
      break
    fi
  done
done
