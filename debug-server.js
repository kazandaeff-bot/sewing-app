process.on('SIGHUP', () => { console.log('[SIGHUP] received'); process.exit(1); });
process.on('SIGINT', () => { console.log('[SIGINT] received'); process.exit(1); });
process.on('SIGTERM', () => { console.log('[SIGTERM] received'); process.exit(1); });
process.on('exit', (code) => { console.log(`[EXIT] code=${code}`); });
process.on('uncaughtException', (err) => { console.log(`[UNCAUGHT] ${err.message}`); process.exit(1); });

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./.next/standalone/server.js');
