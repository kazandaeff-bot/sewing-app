#!/bin/bash
cd /home/z/my-project
npx prisma generate 2>/dev/null
exec bun run dev
