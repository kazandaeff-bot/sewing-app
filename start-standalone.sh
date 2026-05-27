#!/bin/bash
cd /home/z/my-project/.next/standalone
echo $$ > /home/z/my-project/server-pid.txt
exec node server.js
