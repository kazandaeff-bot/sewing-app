#!/bin/bash
cd /home/z/my-project/.next/standalone
export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
exec node --max-old-space-size=512 server.js >> /home/z/my-project/daemon-server.log 2>&1
