#!/bin/bash
# Double-fork daemon pattern
(
  cd /home/z/my-project
  while true; do
    node --max-old-space-size=512 server.js >> /tmp/server.log 2>&1
    echo "$(date): Server exited, restarting in 3s..." >> /tmp/server.log
    sleep 3
  done
) &
# Disown the background process
disown
echo "Daemon started"
