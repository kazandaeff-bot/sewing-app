#!/bin/bash
cd /home/z/my-project
export NODE_ENV=production

echo "alive-server.sh starting at $(date)" > /tmp/alive-server.log

while true; do
  # Start server
  node -e "
    const { createServer } = require('http');
    const next = require('next');
    const app = next({ dev: false });
    const handle = app.getRequestHandler();
    
    ['SIGTERM','SIGINT','SIGHUP'].forEach(sig => {
      process.on(sig, () => console.error('Ignored signal: ' + sig));
    });
    
    app.prepare().then(() => {
      const server = createServer((req, res) => {
        handle(req, res).catch(e => {
          if (!res.headersSent) { res.writeHead(500); res.end('Error'); }
        });
      });
      server.listen(3000, '0.0.0.0', () => console.log('READY on :3000'));
      setInterval(() => {}, 30000);
    }).catch(e => { console.error('PREPARE ERROR:', e); process.exit(1); });
  " 2>>/tmp/alive-server.log
  
  echo "Server crashed at $(date), restarting in 3s..." >> /tmp/alive-server.log
  sleep 3
done
