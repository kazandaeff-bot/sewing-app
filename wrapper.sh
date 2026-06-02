#!/bin/bash
trap 'echo "Received SIGHUP at $(date)" >> /home/z/my-project/signal.log' SIGHUP
trap 'echo "Received SIGINT at $(date)" >> /home/z/my-project/signal.log' SIGINT
trap 'echo "Received SIGTERM at $(date)" >> /home/z/my-project/signal.log' SIGTERM
trap 'echo "Received SIGUSR1 at $(date)" >> /home/z/my-project/signal.log' SIGUSR1
trap 'echo "Received SIGUSR2 at $(date)" >> /home/z/my-project/signal.log' SIGUSR2

cd /home/z/my-project/.next/standalone
export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0
export DATABASE_URL="file:/home/z/my-project/db/custom.db"

echo "Wrapper started at $(date), PID=$$" >> /home/z/my-project/signal.log

exec node --max-old-space-size=512 server.js >> /home/z/my-project/wrapper-server.log 2>&1
