import { spawn } from 'child_process';

let serverProcess = null;

function startServer() {
  console.log(`[${new Date().toISOString()}] Starting Next.js dev server...`);
  serverProcess = spawn('npx', ['next', 'dev', '-p', '3000', '-H', '0.0.0.0'], {
    cwd: '/home/z/my-project',
    stdio: 'inherit',
    env: { ...process.env, PORT: '3000', HOSTNAME: '0.0.0.0' }
  });
  
  serverProcess.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Server exited code=${code} signal=${signal}`);
    setTimeout(startServer, 3000);
  });
}

startServer();

// Self-ping every 10 seconds to keep alive
setInterval(() => {
  fetch('http://localhost:3000').then(r => {
    console.log(`[${new Date().toISOString()}] Self-ping: ${r.status}`);
  }).catch(e => {
    console.log(`[${new Date().toISOString()}] Self-ping failed: ${e.message}`);
  });
}, 10000);

// Prevent exit
process.on('SIGTERM', () => console.log('Ignoring SIGTERM'));
process.on('SIGINT', () => console.log('Ignoring SIGINT'));
