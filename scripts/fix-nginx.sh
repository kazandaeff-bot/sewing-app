#!/bin/bash
echo "=== Fixing nginx configuration ==="

# Fix nginx config - serve static files directly and proxy API requests
cat > /etc/nginx/sites-available/default << 'NGINX'
server {
    listen 80 default_server;
    server_name _;

    # Serve static files directly from the standalone build
    location /_next/static/ {
        alias /opt/sewing-app/src/.next/standalone/.next/static/;
        expires 365d;
        access_log off;
    }

    # Serve public files
    location /favicon.ico {
        alias /opt/sewing-app/src/.next/standalone/public/favicon.ico;
        access_log off;
    }

    location /robots.txt {
        alias /opt/sewing-app/src/.next/standalone/public/robots.txt;
        access_log off;
    }

    location /logo.svg {
        alias /opt/sewing-app/src/.next/standalone/public/logo.svg;
        access_log off;
    }

    # Proxy everything else to Next.js
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
        proxy_send_timeout 300s;
    }
}
NGINX

echo "Testing nginx config..."
nginx -t

echo "Restarting nginx..."
systemctl restart nginx

echo "=== Testing ==="
echo "Main page:"
curl -s -o /dev/null -w "HTTP %{http_code}, size: %{size_download}" http://localhost:80
echo ""
echo "Static test:"
STATIC_PATH=$(curl -s http://localhost:80 | grep -oP '/_next/static/chunks/[^"]+' | head -1)
if [ -n "$STATIC_PATH" ]; then
    echo "Found static path: $STATIC_PATH"
    curl -s -o /dev/null -w "Static file: HTTP %{http_code}, size: %{size_download}" "http://localhost:80$STATIC_PATH"
    echo ""
else
    echo "No static paths found in HTML"
    echo "HTML content:"
    curl -s http://localhost:80 | head -50
fi

echo ""
echo "External test:"
curl -s -o /dev/null -w "External: HTTP %{http_code}" --connect-timeout 5 http://45.91.238.90:80
echo ""

echo "=== DONE ==="
