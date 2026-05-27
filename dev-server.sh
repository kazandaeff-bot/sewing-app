#!/bin/bash
cd /home/z/my-project
LOG="/home/z/my-project/server.log"

echo "[$(date)] Starting dev server with watchdog..." >> "$LOG"

while true; do
  echo "[$(date)] Starting server..." >> "$LOG"
  node -e "
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const app = next({ dev: true });
const handle = app.getRequestHandler();
app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, '0.0.0.0', () => {
    console.log('> Ready on http://0.0.0.0:3000');
  });
});
" >> "$LOG" 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3 seconds..." >> "$LOG"
  sleep 3
done
