#!/bin/bash
echo "=== FIXING BLANK PAGE ==="

# 1. Disable fail2ban
systemctl stop fail2ban 2>/dev/null
systemctl disable fail2ban 2>/dev/null

# 2. The key issue: Next.js standalone needs the FULL .next directory
# The standalone build only contains the minimum files for server.js
# But it needs the full .next directory to serve pages correctly

echo "Step 1: Checking .next directory structure..."
ls -la /opt/sewing-app/src/.next/standalone/.next/ 
echo ""

# 3. Copy the full .next directory over the standalone's partial one
echo "Step 2: Copying full .next directory to standalone..."
# First backup
mv /opt/sewing-app/src/.next/standalone/.next /opt/sewing-app/src/.next/standalone/.next.bak 2>/dev/null
# Copy full .next
cp -r /opt/sewing-app/src/.next /opt/sewing-app/src/.next/standalone/.next
echo "Copied full .next directory"

# 4. Make sure public is also there
echo "Step 3: Copying public directory..."
cp -r /opt/sewing-app/src/public /opt/sewing-app/src/.next/standalone/public 2>/dev/null
echo "Copied public directory"

# 5. Restart the app
echo "Step 4: Restarting app..."
pm2 restart sewing-app 2>/dev/null || pm2 start /opt/sewing-app/ecosystem.config.json
sleep 5

# 6. Test
echo "Step 5: Testing..."
echo "=== HTML from port 3000 ==="
curl -s http://localhost:3000 | head -3
echo ""
echo "=== HTML from nginx port 80 ==="
curl -s http://localhost:80 | head -3
echo ""

echo "=== JS file test ==="
JSFILE=$(curl -s http://localhost:3000 | grep -oP '/_next/static/chunks/[a-zA-Z0-9_~-]+\.js' | head -1)
if [ -n "$JSFILE" ]; then
    echo "JS file: $JSFILE"
    echo "  Direct: $(curl -s -o /dev/null -w '%{http_code} %{size_download}b' http://localhost:3000$JSFILE)"
    echo "  Nginx:  $(curl -s -o /dev/null -w '%{http_code} %{size_download}b' http://localhost:80$JSFILE)"
else
    echo "No JS files found!"
fi

echo ""
echo "=== Body content check ==="
curl -s http://localhost:3000 | grep -oP '<body[^>]*>.*?</body>' | head -c 300
echo ""

echo ""
echo "=== External test ==="
curl -s -o /dev/null -w "HTTP %{http_code}" --connect-timeout 5 http://45.91.238.90:80
echo ""

echo ""
echo "=== PM2 logs (last 10 lines) ==="
pm2 logs sewing-app --lines 10 --nostream 2>&1 | tail -15

pm2 save
echo "=== FIX COMPLETE ==="
