#!/bin/bash
# Keep-alive wrapper that immediately restarts the server
while true; do
  cd /home/z/my-project/.next/standalone
  node server.js
  sleep 1
done
