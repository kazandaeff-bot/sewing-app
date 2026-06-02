#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export NODE_ENV=production
while true; do
  echo "[$(date)] Starting server..." >> server-restarts.log
  node .next/standalone/server.js -p 3000 -H 0.0.0.0 >> prod.log 2>&1
  echo "[$(date)] Server exited with code $?" >> server-restarts.log
  sleep 2
done
