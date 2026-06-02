const fs = require('fs');
fs.writeFileSync('/home/z/my-project/hb4.log', 'STARTING\n');

const signals = ['SIGTERM', 'SIGINT', 'SIGHUP', 'SIGQUIT', 'SIGABRT'];
signals.forEach(sig => {
  process.on(sig, () => {
    fs.appendFileSync('/home/z/my-project/hb4.log', `SIGNAL: ${sig}\n`);
  });
});

process.on('exit', (code) => {
  fs.appendFileSync('/home/z/my-project/hb4.log', `EXIT: code=${code}\n`);
});

let i = 0;
function beat() {
  i++;
  fs.appendFileSync('/home/z/my-project/hb4.log', `BEAT ${i} at ${Date.now()}\n`);
  setTimeout(beat, 2000);
}
beat();

// Start Next.js
const { spawn } = require('child_process');
const child = spawn('node', ['.next/standalone/server.js'], {
  cwd: '/home/z/my-project',
  env: { ...process.env, PORT: '3000', HOSTNAME: '0.0.0.0' },
  stdio: 'pipe'
});
child.stdout.on('data', d => fs.appendFileSync('/home/z/my-project/hb4.log', `CHILD: ${d}`));
child.stderr.on('data', d => fs.appendFileSync('/home/z/my-project/hb4.log', `CHILD-E: ${d}`));
child.on('exit', (code, sig) => fs.appendFileSync('/home/z/my-project/hb4.log', `CHILD EXIT code=${code} sig=${sig}\n`));

fs.appendFileSync('/home/z/my-project/hb4.log', `MANAGER pid=${process.pid} child=${child.pid}\n`);
