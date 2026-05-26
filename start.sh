#!/bin/bash
# Start the Next.js dev server on port 3000
# Used as the primary server (standalone has stability issues)

PORT=3000
LOG=/tmp/next-server.log

# Kill any existing server
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
pkill -f "server.js.*3000" 2>/dev/null
sleep 2

# Start dev server
cd /home/z/my-project
nohup npx next dev -p $PORT > $LOG 2>&1 &

echo "Server starting on port $PORT..."
sleep 5

# Verify
if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ | grep -q "200"; then
  echo "✓ Server is running on port $PORT"
else
  echo "✗ Server failed to start"
  cat $LOG
fi
