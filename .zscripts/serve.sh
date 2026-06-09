#!/bin/bash
cd /home/z/my-project
export JWT_SECRET=super-z-sewing-production-2026-secret-key-x9k2m
export PORT=3000
export HOSTNAME=0.0.0.0

while true; do
  echo "[$(date +%H:%M:%S)] Starting Next.js dev server..."
  node_modules/.bin/next dev --port 3000 --hostname 0.0.0.0
  echo "[$(date +%H:%M:%S)] Server exited, restarting in 2s..."
  sleep 2
done
