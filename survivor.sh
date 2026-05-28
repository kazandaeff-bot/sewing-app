#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS='--max-old-space-size=4096'
while true; do
  npx next dev -p 3000 -H 0.0.0.0 >> /home/z/my-project/dev.log 2>&1
  sleep 0.5
done
