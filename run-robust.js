// Trap all signals
['SIGTERM','SIGINT','SIGHUP','SIGPIPE','SIGUSR1','SIGUSR2'].forEach(sig => {
  process.on(sig, () => {
    console.log(`Signal ${sig} received - ignoring`, new Date().toISOString());
  });
});

process.on('exit', (code) => {
  console.log(`Process exiting with code: ${code}`, new Date().toISOString());
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

const next = require('next');
const http = require('http');

const port = 3000;
console.log('Starting production server...', new Date().toISOString());

const app = next({ dev: false });
const handle = app.getRequestHandler();

setInterval(() => {}, 5000);

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
    console.log(`✓ Server listening on 0.0.0.0:${port}`, new Date().toISOString());
  });

  server.on('error', (e) => {
    console.error('Server error:', e);
  });
}).catch(e => {
  console.error('Prepare error:', e);
  process.exit(1);
});
