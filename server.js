#!/usr/bin/env node
const next = require('next');
const http = require('http');

const isDev = process.env.NODE_ENV === 'development';
const port = parseInt(process.env.PORT || '3000', 10);

console.log(`Starting ${isDev ? 'development' : 'production'} server on port ${port}...`);

const app = next({ dev: isDev, dir: '/home/z/my-project' });
const handle = app.getRequestHandler();

// Keep process alive — prevent idle termination in containerized environments
// Some container runtimes kill processes when the event loop is empty
setInterval(() => {
  // Heartbeat to keep the event loop active
}, 5000);

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res).catch(e => {
      console.error('[HANDLER ERROR]', e.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`✓ ${isDev ? 'Development' : 'Production'} server listening on 0.0.0.0:${port}`);
  });

  server.on('error', (e) => {
    console.error('Server error:', e);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
  });
}).catch(e => {
  console.error('Prepare error:', e);
  process.exit(1);
});
