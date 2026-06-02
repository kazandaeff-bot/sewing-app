#!/bin/bash
cd /home/z/my-project

# Kill existing server
fuser -k 3000/tcp 2>/dev/null || true
sleep 2

# Ensure port is free
if lsof -ti:3000 >/dev/null 2>&1; then
  echo "ERROR: Port 3000 still occupied after kill"
  exit 1
fi

# Start server using next start (handles Turbopack dynamic chunks correctly)
/home/z/my-project/.zscripts/start-server-bin npx next start -p 3000

sleep 3
if curl -s -o /dev/null -w "" http://localhost:3000/ 2>/dev/null; then
  echo "Server started successfully"
else
  echo "Server may have failed to start"
fi
