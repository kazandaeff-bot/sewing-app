#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS='--max-old-space-size=4096'
while true; do
  echo "[$(date)] Starting server..." >> /tmp/persistent-server.log
  npx next dev -p 3000 -H 0.0.0.0 >> /home/z/my-project/dev.log 2>&1
  EXIT=$?
  echo "[$(date)] Server exited with code $EXIT" >> /tmp/persistent-server.log
  sleep 2
done
