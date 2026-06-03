#!/bin/bash
cd /home/z/my-project
while true; do
  bunx next dev -p 3000 -H 0.0.0.0 2>&1 | tee -a /home/z/my-project/dev.log
  echo "Server died at $(date), restarting in 3s..." >> /home/z/my-project/dev.log
  sleep 3
done
