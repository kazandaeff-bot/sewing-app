#!/bin/bash
# Keeps the server running - restarts on crash
cd /home/z/my-project
while true; do
  timeout 86400 node --max-old-space-size=512 server.js 2>&1
  EXIT=$?
  if [ $EXIT -eq 124 ]; then
    echo "Timeout expired, restarting..."
  elif [ $EXIT -eq 0 ]; then
    echo "Server exited normally, restarting..."
  else
    echo "Server crashed with code $EXIT, restarting in 5s..."
    sleep 5
  fi
done
