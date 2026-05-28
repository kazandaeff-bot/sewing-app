#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS='--max-old-space-size=4096'
export PORT=3000
while true; do
  echo "[$(date)] Starting next server..." >> /tmp/server-watchdog.log
  npx next start -p 3000 >> /tmp/server.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..." >> /tmp/server-watchdog.log
  sleep 3
done
