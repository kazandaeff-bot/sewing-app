#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS='--max-old-space-size=2048'
while true; do
  echo "[$(date)] Starting server..." >> /tmp/server-watchdog.log
  bun .next/standalone/server.js >> /tmp/server-watchdog.log 2>&1
  EXIT=$?
  echo "[$(date)] Server exited with code $EXIT, restarting in 3s..." >> /tmp/server-watchdog.log
  sleep 3
done
