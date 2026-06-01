#!/bin/bash
# Simple daemon that keeps server alive
# PID file for tracking
PIDFILE=/tmp/server-daemon.pid
LOGFILE=/tmp/server-daemon.log

cleanup() {
    if [ -f "$PIDFILE" ]; then
        kill $(cat "$PIDFILE") 2>/dev/null
        rm -f "$PIDFILE"
    fi
}

trap cleanup EXIT INT TERM

while true; do
    cd /home/z/my-project
    export NODE_ENV=production
    node --max-old-space-size=256 server.js >> "$LOGFILE" 2>&1 &
    SERVER_PID=$!
    echo "$SERVER_PID" > "$PIDFILE"
    echo "[$(date)] Server started (PID: $SERVER_PID)" >> "$LOGFILE"
    
    # Wait for server process
    wait $SERVER_PID 2>/dev/null
    EXIT_CODE=$?
    echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..." >> "$LOGFILE"
    sleep 3
done
