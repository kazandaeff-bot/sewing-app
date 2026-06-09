#!/bin/bash
while true; do
  echo "[$(date)] Starting server..."
  NODE_ENV=production node /home/z/my-project/run-robust.js
  EXIT=$?
  echo "[$(date)] Server exited with code $EXIT, restarting in 3s..."
  sleep 3
done
