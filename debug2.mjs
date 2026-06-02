import { spawn } from 'child_process';

const signals = ['SIGTERM', 'SIGINT', 'SIGHUP', 'SIGUSR1', 'SIGUSR2', 'SIGPIPE', 'SIGALRM', 'SIGQUIT', 'SIGABRT'];
signals.forEach(sig => {
  process.on(sig, () => {
    console.log(`[${new Date().toISOString()}] Received ${sig}`);
  });
});

process.on('exit', (code) => {
  console.log(`[${new Date().toISOString()}] EXIT code=${code}`);
  // Try to write synchronously
  require('fs').appendFileSync('/home/z/my-project/death.log', `${new Date().toISOString()} EXIT code=${code}\n`);
});

// Start Next.js
const child = spawn('node', ['.next/standalone/server.js'], {
  cwd: '/home/z/my-project',
  env: { ...process.env, PORT: '3000', HOSTNAME: '0.0.0.0' },
  stdio: 'inherit'
});

child.on('exit', (code, signal) => {
  console.log(`[${new Date().toISOString()}] Child exited code=${code} signal=${signal}`);
});

// Very fast heartbeat
let count = 0;
const iv = setInterval(() => {
  count++;
  console.log(`[${new Date().toISOString()}] BEAT #${count} pid=${process.pid}`);
  require('fs').appendFileSync('/home/z/my-project/heartbeat.log', `${new Date().toISOString()} BEAT #${count}\n`);
}, 1000);

console.log(`[${new Date().toISOString()}] Started manager pid=${process.pid} child=${child.pid}`);
