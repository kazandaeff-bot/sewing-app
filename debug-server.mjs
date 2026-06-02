import { createServer } from 'http';
import { spawn } from 'child_process';

const signals = ['SIGTERM', 'SIGINT', 'SIGHUP', 'SIGUSR1', 'SIGUSR2', 'SIGPIPE', 'SIGALRM', 'SIGQUIT', 'SIGABRT'];
signals.forEach(sig => {
  process.on(sig, () => {
    console.log(`[${new Date().toISOString()}] Received ${sig} - IGNORING and staying alive!`);
  });
});

process.on('exit', (code) => {
  console.log(`[${new Date().toISOString()}] Process exiting with code: ${code}`);
});

process.on('uncaughtException', (err) => {
  console.log(`[${new Date().toISOString()}] Uncaught exception: ${err.message}`);
});

// Start Next.js as child process
const child = spawn('node', ['.next/standalone/server.js'], {
  cwd: '/home/z/my-project',
  env: { ...process.env, PORT: '3000', HOSTNAME: '0.0.0.0', NODE_ENV: 'production' },
  stdio: 'inherit'
});

child.on('exit', (code, signal) => {
  console.log(`[${new Date().toISOString()}] Next.js exited code=${code} signal=${signal}`);
});

signals.forEach(sig => {
  child.on(sig, () => {
    console.log(`[${new Date().toISOString()}] Child received ${sig}`);
  });
});

// Keep the process alive with a timer
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Heartbeat - process still alive, pid=${process.pid}`);
}, 10000);

console.log(`[${new Date().toISOString()}] Manager started with PID=${process.pid}, child PID=${child.pid}`);
