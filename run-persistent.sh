#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
while true; do
  echo "Starting server at $(date)" >> server-restarts.log
  node .next/standalone/server.js -p 3000 -H 0.0.0.0 >> prod.log 2>&1
  EXIT_CODE=$?
  echo "Server exited with code $EXIT_CODE at $(date)" >> server-restarts.log
  sleep 2
done
