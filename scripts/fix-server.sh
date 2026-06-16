#!/bin/bash
echo "=== Fixing server ==="

echo "1. Disabling fail2ban..."
systemctl stop fail2ban 2>/dev/null
systemctl disable fail2ban 2>/dev/null

echo "2. Starting app on port 80..."
pm2 start /opt/sewing-app/ecosystem.config.json 2>/dev/null || pm2 restart sewing-app 2>/dev/null
sleep 3

echo "3. Setting up pm2 auto-start..."
pm2 startup systemd -u root --hp /root 2>/dev/null
pm2 save

echo "4. Checking network..."
echo "=== IP addresses ==="
ip -4 addr show | grep inet
echo ""
echo "=== Listening ports ==="
ss -tlnp | grep -E ":80|:443|:3000"
echo ""
echo "=== Firewall rules ==="
iptables -L -n -v
echo ""
echo "=== NAT rules ==="
iptables -t nat -L -n
echo ""
echo "=== NFT rules ==="
nft list ruleset 2>/dev/null || echo "nft not available"
echo ""
echo "=== UFW status ==="
ufw status verbose
echo ""
echo "=== Reverse path filtering ==="
sysctl net.ipv4.conf.all.rp_filter net.ipv4.conf.eth0.rp_filter
echo ""
echo "=== Localhost test ==="
curl -s -o /dev/null -w "localhost: HTTP %{http_code}" http://localhost:80
echo ""
echo "=== External IP test ==="
curl -s -o /dev/null -w "external: HTTP %{http_code}" --connect-timeout 5 http://45.91.238.90:80
echo ""

echo "5. Installing nginx as reverse proxy test..."
apt-get update -qq && apt-get install -y -qq nginx > /dev/null 2>&1
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
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

echo "6. Stopping app on port 80, restarting on port 3000..."
pm2 stop sewing-app
pm2 delete sewing-app
# Create new ecosystem for port 3000
cat > /opt/sewing-app/ecosystem.config.json << 'ECO'
{"apps":[{"name":"sewing-app","script":"/opt/sewing-app/src/.next/standalone/server.js","env":{"HOSTNAME":"0.0.0.0","PORT":"3000","JWT_SECRET":"sewing-prod-2024-kj7Hx9mP3vRz5wBq8nL2sY4dT6fA0cE","DATABASE_URL":"file:/opt/sewing-app/db/custom.db"}}]}
ECO
pm2 start /opt/sewing-app/ecosystem.config.json
sleep 3

echo "7. Starting nginx..."
nginx -t && systemctl restart nginx && systemctl enable nginx

echo "8. Final tests..."
curl -s -o /dev/null -w "nginx_localhost: HTTP %{http_code}" http://localhost:80
echo ""
curl -s -o /dev/null -w "nginx_external: HTTP %{http_code}" --connect-timeout 5 http://45.91.238.90:80
echo ""
curl -s -o /dev/null -w "app_3000: HTTP %{http_code}" http://localhost:3000
echo ""

pm2 save
echo "=== DONE ==="
