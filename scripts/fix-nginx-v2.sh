#!/bin/bash
echo "=== Fixing nginx - proxy all to Next.js ==="

# Simple nginx config - proxy everything to Next.js
cat > /etc/nginx/sites-available/default << 'NGINX'
server {
    listen 80 default_server;
    server_name _;

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

nginx -t && systemctl restart nginx

echo "=== Testing all JS files ==="
# Get JS file paths from HTML and test each one
for js in $(curl -s http://localhost:80 | grep -oP '/_next/static/chunks/[^"]+' | head -5); do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:80$js")
    echo "  $js -> HTTP $CODE"
done

echo ""
echo "=== Full page size ==="
curl -s -o /dev/null -w "HTTP %{http_code}, size: %{size_download} bytes" http://localhost:80
echo ""

echo "=== External test ==="
curl -s -o /dev/null -w "HTTP %{http_code}" --connect-timeout 5 http://45.91.238.90:80
echo ""

echo "=== Browser test - check for JS errors ==="
# Download the page and all its resources to check
HTML=$(curl -s http://localhost:80)
echo "Page title: $(echo $HTML | grep -oP '<title>[^<]+' | head -1)"
echo "Script count: $(echo $HTML | grep -c '<script')"
echo "CSS count: $(echo $HTML | grep -c '<link.*stylesheet')"

# Check if the body has content
echo "Body content preview:"
echo $HTML | grep -oP '<body[^>]*>.*?</body>' | head -c 200
echo ""

echo "=== DONE ==="
