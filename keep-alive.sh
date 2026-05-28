#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting server..."
  node .next/standalone/server.js
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done
