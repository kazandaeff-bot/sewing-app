#!/bin/bash
echo "=========================================="
echo "  DIAGNOSING BLANK PAGE ISSUE"
echo "=========================================="

# 1. Disable fail2ban
systemctl stop fail2ban 2>/dev/null
systemctl disable fail2ban 2>/dev/null
mv /etc/systemd/system/multi-user.target.wants/fail2ban.service /tmp/ 2>/dev/null
systemctl daemon-reload 2>/dev/null

# 2. Make sure app is running
pm2 start /opt/sewing-app/ecosystem.config.json 2>/dev/null || pm2 restart sewing-app 2>/dev/null
sleep 3

echo ""
echo "=== STEP 1: Check if app responds on port 3000 ==="
APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
echo "Port 3000: HTTP $APP_STATUS"

echo ""
echo "=== STEP 2: Check HTML content directly from app ==="
HTML_DIRECT=$(curl -s http://localhost:3000)
echo "HTML size: $(echo "$HTML_DIRECT" | wc -c) bytes"
echo "Title: $(echo "$HTML_DIRECT" | grep -oP '<title>[^<]*</title>')"
echo "Script tags: $(echo "$HTML_DIRECT" | grep -c '<script')"

echo ""
echo "=== STEP 3: Check HTML content through nginx ==="
HTML_NGINX=$(curl -s http://localhost:80)
echo "HTML size: $(echo "$HTML_NGINX" | wc -c) bytes"
echo "Title: $(echo "$HTML_NGINX" | grep -oP '<title>[^<]*</title>')"
echo "Script tags: $(echo "$HTML_NGINX" | grep -c '<script')"

echo ""
echo "=== STEP 4: Test a JS file - direct vs nginx ==="
JSFILE=$(echo "$HTML_DIRECT" | grep -oP '/_next/static/chunks/[a-zA-Z0-9_~-]+\.js' | head -1)
if [ -n "$JSFILE" ]; then
    echo "Testing JS file: $JSFILE"
    
    DIRECT_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$JSFILE")
    DIRECT_TYPE=$(curl -s -I "http://localhost:3000$JSFILE" | grep -i content-type)
    DIRECT_SIZE=$(curl -s -o /dev/null -w "%{size_download}" "http://localhost:3000$JSFILE")
    echo "  Direct (port 3000): HTTP $DIRECT_CODE, size: $DIRECT_SIZE, $DIRECT_TYPE"
    
    NGINX_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:80$JSFILE")
    NGINX_TYPE=$(curl -s -I "http://localhost:80$JSFILE" | grep -i content-type)
    NGINX_SIZE=$(curl -s -o /dev/null -w "%{size_download}" "http://localhost:80$JSFILE")
    echo "  Nginx (port 80): HTTP $NGINX_CODE, size: $NGINX_SIZE, $NGINX_TYPE"
else
    echo "No JS file found in HTML!"
    echo "HTML preview:"
    echo "$HTML_DIRECT" | head -5
fi

echo ""
echo "=== STEP 5: Check for hydration issues ==="
# Check if there's server-rendered content in the body
BODY_CONTENT=$(echo "$HTML_DIRECT" | grep -oP '<body[^>]*>.*?</body>')
if [ -n "$BODY_CONTENT" ]; then
    echo "Body content length: $(echo "$BODY_CONTENT" | wc -c) bytes"
else
    echo "No body content found - app uses client-side rendering only"
fi

echo ""
echo "=== STEP 6: Check .env file ==="
cat /opt/sewing-app/src/.env 2>/dev/null || echo "No .env file"

echo ""
echo "=== STEP 7: Check pm2 logs for errors ==="
pm2 logs sewing-app --lines 10 --nostream 2>&1

echo ""
echo "=== STEP 8: External access test ==="
curl -s -o /dev/null -w "External HTTP: %{http_code}" --connect-timeout 5 http://45.91.238.90:80
echo ""

echo ""
echo "=========================================="
echo "  DIAGNOSIS COMPLETE"
echo "=========================================="
