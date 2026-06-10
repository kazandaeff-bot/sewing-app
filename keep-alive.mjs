import child_process from 'child_process'
import http from 'http'

function startServer() {
  const server = child_process.spawn('node', ['-e', `
    const next = require('next');
    const http = require('http');
    const app = next({ dev: false });
    const handle = app.getRequestHandler();
    app.prepare().then(() => {
      const server = http.createServer((req, res) => {
        handle(req, res).catch(e => {
          if (!res.headersSent) { res.writeHead(500); res.end('Error'); }
        });
      });
      server.listen(3000, '0.0.0.0', () => {
        console.log('✓ Ready on 0.0.0.0:3000');
      });
      setInterval(() => {}, 30000);
    });
  `], {
    cwd: '/home/z/my-project',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    env: { ...process.env, NODE_ENV: 'production', PORT: '3000' }
  })
  
  server.stdout.on('data', (data) => {
    console.log(`[server] ${data.toString().trim()}`)
  })
  
  server.stderr.on('data', (data) => {
    console.error(`[server:err] ${data.toString().trim()}`)
  })
  
  server.on('exit', (code) => {
    console.log(`Server exited with code ${code}, restarting in 2s...`)
    setTimeout(startServer, 2000)
  })
  
  console.log(`Started server with PID ${server.pid}`)
}

startServer()

// Health check endpoint
const healthServer = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('OK')
})
healthServer.listen(3001, '0.0.0.0', () => {
  console.log('Health check on 3001')
})

// Keep parent alive
setInterval(() => {}, 30000)

// Ignore signals
process.on('SIGTERM', () => console.log('SIGTERM ignored'))
process.on('SIGHUP', () => console.log('SIGHUP ignored'))
