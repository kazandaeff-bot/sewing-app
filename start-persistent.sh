#!/bin/bash
cd /home/z/my-project/.next/standalone
export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0
export DATABASE_URL="file:/home/z/my-project/db/custom.db"

# Write PID file
echo $$ > /home/z/my-project/server-pid.txt

# Start server
exec node --max-old-space-size=256 server.js >> /home/z/my-project/server.log 2>&1
