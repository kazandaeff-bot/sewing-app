import { spawn } from 'child_process'
import http from 'http'

function startServer() {
  const server = spawn('node', ['.next/standalone/server.js', '-p', '3000', '-H', '127.0.0.1'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })
  
  server.stdout.on('data', (data) => {
    console.log(`[out] ${data.toString().trim()}`)
  })
  
  server.stderr.on('data', (data) => {
    console.error(`[err] ${data.toString().trim()}`)
  })
  
  server.on('exit', (code) => {
    console.log(`Server exited with code ${code}, restarting in 2s...`)
    setTimeout(startServer, 2000)
  })
  
  server.on('error', (err) => {
    console.error(`Server error: ${err.message}`)
    setTimeout(startServer, 2000)
  })
  
  console.log(`Started server with PID ${server.pid}`)
  return server
}

startServer()

// Keep parent alive
setInterval(() => {}, 30000)

// Ignore termination signals
process.on('SIGTERM', () => console.log('SIGTERM ignored'))
process.on('SIGHUP', () => console.log('SIGHUP ignored'))
process.on('SIGINT', () => console.log('SIGINT ignored'))
