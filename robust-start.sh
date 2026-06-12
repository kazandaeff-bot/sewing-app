#!/bin/bash
cd /home/z/my-project
export NODE_ENV=production

while true; do
  echo "[$(date)] Starting Next.js server..." >> /tmp/server-monitor.log
  node --max-old-space-size=512 .next/standalone/server.js -p 3000 -H 127.0.0.1 >> /tmp/next-out.log 2>> /tmp/next-error.log
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 2s..." >> /tmp/server-monitor.log
  sleep 2
done
