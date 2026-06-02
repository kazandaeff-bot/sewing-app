#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS='--max-old-space-size=4096'
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
while true; do
  echo "[$(date)] Starting dev server..." >> /tmp/persistent-server.log
  node node_modules/.bin/next dev -p 3000 -H 0.0.0.0 >> /home/z/my-project/dev.log 2>&1
  EXIT=$?
  echo "[$(date)] Server exited with code $EXIT" >> /tmp/persistent-server.log
  sleep 3
done
