import { spawn } from 'child_process';

function startServer() {
  console.log(`[${new Date().toISOString()}] Starting server...`);
  const child = spawn('node', ['.next/standalone/server.js'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, PORT: '3000', HOSTNAME: '0.0.0.0' },
    stdio: 'inherit'
  });
  
  child.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Server exited with code=${code} signal=${signal}, restarting in 3s...`);
    setTimeout(startServer, 3000);
  });
  
  child.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Server error:`, err);
    setTimeout(startServer, 3000);
  });
}

startServer();

// Keep process alive
process.on('SIGTERM', () => console.log('SIGTERM received, ignoring'));
process.on('SIGINT', () => console.log('SIGINT received, ignoring'));
