#!/bin/bash
cd /home/z/my-project
export PORT=8080
export HOSTNAME=0.0.0.0
exec node .next/standalone/server.js
