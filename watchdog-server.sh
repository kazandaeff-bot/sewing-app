#!/bin/bash
cd /home/z/my-project/.next/standalone
LOG="/home/z/my-project/server.log"

echo "[$(date)] Starting standalone server with watchdog..." >> "$LOG"

while true; do
  echo "[$(date)] Starting server..." >> "$LOG"
  node server.js >> "$LOG" 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3 seconds..." >> "$LOG"
  sleep 3
done
