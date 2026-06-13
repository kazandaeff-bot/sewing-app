#!/bin/bash
cd /home/z/my-project
export JWT_SECRET=sewing-prod-2024-kj7Hx9mP3vRz5wBq8nL2sY4dT6fA0cE
export DATABASE_URL=file:/home/z/my-project/db/custom.db
export HOSTNAME=0.0.0.0
export PORT=3000
export NODE_OPTIONS="--max-old-space-size=128"

while true; do
  echo "[$(date +%H:%M:%S)] Starting server..." >> /tmp/auto-server.log
  node run-robust.js >> /tmp/auto-server.log 2>&1
  echo "[$(date +%H:%M:%S)] Server exited, restarting in 2s..." >> /tmp/auto-server.log
  sleep 2
done
