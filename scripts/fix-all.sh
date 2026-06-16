#!/bin/bash
echo "=========================================="
echo "  COMPREHENSIVE FIX FOR BLANK PAGE"
echo "=========================================="

# 1. Disable fail2ban permanently
echo ""
echo "=== STEP 1: Disable fail2ban ==="
systemctl stop fail2ban 2>/dev/null
systemctl disable fail2ban 2>/dev/null
# Remove from systemd
rm -f /etc/systemd/system/multi-user.target.wants/fail2ban.service 2>/dev/null
systemctl daemon-reload 2>/dev/null
echo "fail2ban disabled"

# 2. Stop the app
echo ""
echo "=== STEP 2: Stop app ==="
pm2 stop sewing-app 2>/dev/null
pm2 delete sewing-app 2>/dev/null
sleep 1

# 3. Fix the ecosystem config - THE KEY FIX!
# standalone server.js MUST have cwd set to its own directory
echo ""
echo "=== STEP 3: Fix ecosystem.config.json ==="
cat > /opt/sewing-app/ecosystem.config.json << 'ECOSEOF'
{
  "apps": [
    {
      "name": "sewing-app",
      "script": "server.js",
      "cwd": "/opt/sewing-app/src/.next/standalone",
      "env": {
        "HOSTNAME": "0.0.0.0",
        "PORT": "3000",
        "NODE_ENV": "production",
        "JWT_SECRET": "sewing-prod-2024-kj7Hx9mP3vRz5wBq8nL2sY4dT6fA0cE",
        "DATABASE_URL": "file:/opt/sewing-app/db/custom.db"
      }
    }
  ]
}
ECOSEOF
echo "ecosystem.config.json updated with cwd=/opt/sewing-app/src/.next/standalone"

# 4. Clean up the bad .next copy from previous fix
echo ""
echo "=== STEP 4: Clean up bad copies ==="
# Remove the incorrectly nested .next directory (previous fix created .next/standalone/.next/standalone/)
rm -rf /opt/sewing-app/src/.next/standalone/.next/standalone 2>/dev/null
rm -rf /opt/sewing-app/src/.next/standalone/.next.bak 2>/dev/null
echo "Cleaned up bad copies"

# 5. Properly copy static files to standalone
echo ""
echo "=== STEP 5: Copy static files to standalone ==="
# This is THE critical step for standalone mode:
# .next/static must be inside .next/standalone/.next/static
# public must be inside .next/standalone/public

# Remove old static if exists
rm -rf /opt/sewing-app/src/.next/standalone/.next/static 2>/dev/null
rm -rf /opt/sewing-app/src/.next/standalone/public 2>/dev/null

# Copy static (JS/CSS bundles)
cp -r /opt/sewing-app/src/.next/static /opt/sewing-app/src/.next/standalone/.next/static
echo "Copied .next/static -> .next/standalone/.next/static"

# Copy public folder
cp -r /opt/sewing-app/src/public /opt/sewing-app/src/.next/standalone/public
echo "Copied public -> .next/standalone/public"

# Verify
echo ""
echo "Verification - static files exist:"
ls -la /opt/sewing-app/src/.next/standalone/.next/static/ 2>/dev/null | head -5
echo ""
echo "Verification - public files exist:"
ls -la /opt/sewing-app/src/.next/standalone/public/ 2>/dev/null

# 6. Fix nginx configuration
echo ""
echo "=== STEP 6: Fix nginx config ==="
cat > /etc/nginx/sites-available/default << 'NGINXEOF'
server {
    listen 80 default_server;
    server_name _;

    # Next.js static files - serve directly from filesystem for speed
    location /_next/static/ {
        alias /opt/sewing-app/src/.next/standalone/.next/static/;
        expires 365d;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    # Public assets (logo, robots.txt, etc)
    location /robots.txt {
        alias /opt/sewing-app/src/.next/standalone/public/robots.txt;
        access_log off;
    }

    location /logo.svg {
        alias /opt/sewing-app/src/.next/standalone/public/logo.svg;
        access_log off;
    }

    # All other requests go to Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
NGINXEOF

# Test and reload nginx
nginx -t 2>&1
systemctl reload nginx
echo "nginx configured and reloaded"

# 7. Start the app with fixed config
echo ""
echo "=== STEP 7: Start app with fixed config ==="
pm2 start /opt/sewing-app/ecosystem.config.json
sleep 5

# 8. Verify
echo ""
echo "=== STEP 8: Verification ==="

echo ""
echo "--- App status ---"
pm2 status

echo ""
echo "--- Test HTML from port 3000 ---"
HTML3000=$(curl -s http://localhost:3000)
echo "Size: $(echo "$HTML3000" | wc -c) bytes"
echo "Title: $(echo "$HTML3000" | grep -oP '<title>[^<]*</title>')"
echo "Script count: $(echo "$HTML3000" | grep -c '<script')"

echo ""
echo "--- Test HTML from nginx port 80 ---"
HTML80=$(curl -s http://localhost:80)
echo "Size: $(echo "$HTML80" | wc -c) bytes"
echo "Title: $(echo "$HTML80" | grep -oP '<title>[^<]*</title>')"
echo "Script count: $(echo "$HTML80" | grep -c '<script')"

echo ""
echo "--- Test JS file access ---"
JSFILE=$(echo "$HTML3000" | grep -oP '/_next/static/chunks/[a-zA-Z0-9_.-]+\.js' | head -1)
if [ -n "$JSFILE" ]; then
    echo "Testing JS file: $JSFILE"
    echo "  Port 3000: $(curl -s -o /dev/null -w 'HTTP %{http_code}, size %{size_download}' http://localhost:3000$JSFILE)"
    echo "  Port 80:   $(curl -s -o /dev/null -w 'HTTP %{http_code}, size %{size_download}' http://localhost:80$JSFILE)"
    echo "  Content-Type port 80: $(curl -s -I http://localhost:80$JSFILE | grep -i content-type)"
else
    echo "WARNING: No JS files found in HTML!"
    echo "HTML preview (first 500 chars):"
    echo "$HTML3000" | head -c 500
fi

echo ""
echo "--- Test CSS file access ---"
CSSFILE=$(echo "$HTML3000" | grep -oP '/_next/static/css/[a-zA-Z0-9_.-]+\.css' | head -1)
if [ -n "$CSSFILE" ]; then
    echo "Testing CSS file: $CSSFILE"
    echo "  Port 80: $(curl -s -o /dev/null -w 'HTTP %{http_code}, size %{size_download}' http://localhost:80$CSSFILE)"
else
    echo "No CSS files found (might be inline)"
fi

echo ""
echo "--- External access test ---"
curl -s -o /dev/null -w "HTTP %{http_code}" --connect-timeout 5 http://45.91.238.90:80
echo ""

echo ""
echo "--- PM2 logs (last 15 lines) ---"
pm2 logs sewing-app --lines 15 --nostream 2>&1 | tail -20

# 9. Setup pm2 startup for auto-restart
echo ""
echo "=== STEP 9: Setup pm2 auto-startup ==="
pm2 save 2>/dev/null
pm2 startup 2>&1 | tail -1
echo ""

echo "=========================================="
echo "  FIX COMPLETE!"
echo "=========================================="
echo ""
echo "Key changes made:"
echo "1. cwd set to /opt/sewing-app/src/.next/standalone"
echo "2. Static files properly copied to standalone/.next/static"
echo "3. nginx serves /_next/static/ directly from filesystem"
echo "4. fail2ban disabled"
echo ""
echo "If still blank, open browser DevTools -> Network tab"
echo "and check if JS/CSS files are loading (200) or failing (404)"
