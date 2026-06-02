#!/bin/bash
cd /home/z/my-project/.next/standalone
export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
while true; do
  node server.js
  echo "Server exited with code $?. Restarting in 3s..."
  sleep 3
done
