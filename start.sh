#!/bin/bash
cd /home/z/my-project
export NODE_ENV=production
export JWT_SECRET=sewing-prod-2026-secure-key-change-on-vps-x9k2m
export DATABASE_URL=file:/home/z/my-project/db/custom.db
exec node .next/standalone/server.js -p 3000 -H 127.0.0.1
