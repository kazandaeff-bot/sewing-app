#!/bin/bash
# Setup script for sewing-app production deployment
set -e

echo "=== Stopping old processes ==="
pm2 stop sewing-app 2>/dev/null || true
pm2 delete sewing-app 2>/dev/null || true

echo "=== Downloading ecosystem config ==="
curl -o /opt/sewing-app/ecosystem.config.json https://raw.githubusercontent.com/kazandaeff-bot/sewing-app/main/ecosystem.config.json

echo "=== Starting app on port 80 ==="
pm2 start /opt/sewing-app/ecosystem.config.json

sleep 5

echo "=== Status ==="
pm2 status

echo "=== Testing HTTP ==="
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:80

echo "=== Saving pm2 config ==="
pm2 save

echo "=== Done! App should be available at http://45.91.238.90 ==="
