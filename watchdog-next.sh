#!/bin/bash
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0
export NODE_ENV=production

while true; do
  node .next/standalone/server.js >> /home/z/my-project/server.log 2>&1
  echo "[$(date)] Next.js exited, restarting in 2s..." >> /home/z/my-project/server.log
  sleep 2
done
