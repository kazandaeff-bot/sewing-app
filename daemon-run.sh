#!/bin/bash
cd /home/z/my-project
export NODE_ENV=production
exec node -e "
const signals = ['SIGTERM','SIGINT','SIGHUP','SIGPIPE','SIGUSR1','SIGUSR2','SIGABRT'];
signals.forEach(sig => {
  process.on(sig, () => {
    console.error('RECEIVED: ' + sig + ' - ignoring');
  });
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT: ' + err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED: ' + reason);
});

const { createServer } = require('http');
const next = require('next');
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res).catch(e => {
      if (!res.headersSent) { res.writeHead(500); res.end('Error'); }
    });
  });
  server.listen(3000, '0.0.0.0', () => {
    console.log('READY on :3000');
  });
  setInterval(() => {}, 30000);
}).catch(e => {
  console.error('PREPARE ERROR:', e);
  process.exit(1);
});
"
