#!/bin/bash
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0  
export NODE_OPTIONS="--max-old-space-size=512"
while true; do
  echo "[$(date)] Starting server..." >> /tmp/server-cycle.log
  node run-robust.js >> /tmp/server-cycle.log 2>&1
  echo "[$(date)] Server exited ($?), restarting in 3s..." >> /tmp/server-cycle.log
  sleep 3
done
