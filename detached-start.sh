#!/bin/bash
cd /home/z/my-project
export PORT=3000
export HOSTNAME=0.0.0.0

# Close all file descriptors and redirect to /dev/null
exec 0</dev/null
exec 1>/home/z/my-project/server-stdout.log
exec 2>/home/z/my-project/server-stderr.log

# Start the server
exec node .next/standalone/server.js
