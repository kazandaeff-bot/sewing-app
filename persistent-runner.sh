#!/bin/bash
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0
while true; do
  echo "$(date): Starting server..." >> persistent.log
  node .next/standalone/server.js >> persistent.log 2>&1
  EXIT_CODE=$?
  echo "$(date): Server exited with code $EXIT_CODE" >> persistent.log
  sleep 2
done
