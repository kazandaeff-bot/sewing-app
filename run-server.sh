#!/bin/sh
cd /home/z/my-project
export NODE_ENV=production
export PORT=3000
export HOSTNAME=127.0.0.1
export NODE_OPTIONS="--max-old-space-size=128"

while true; do
  node .next/standalone/server.js
  echo "[$(date)] Server crashed, restarting in 2s..." >> /tmp/server-restarts.log
  sleep 2
done
