import child_process from 'child_process'
import http from 'http'

function startServer() {
  const server = child_process.spawn('node', ['server.js'], {
    cwd: '/home/z/my-project/.next/standalone',
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  })
  
  server.stdout.on('data', (data) => {
    console.log(`[server] ${data.toString().trim()}`)
  })
  
  server.stderr.on('data', (data) => {
    console.error(`[server:err] ${data.toString().trim()}`)
  })
  
  server.on('exit', (code) => {
    console.log(`Server exited with code ${code}, restarting in 3s...`)
    setTimeout(startServer, 3000)
  })
  
  server.on('error', (err) => {
    console.error(`Server error: ${err.message}`)
    setTimeout(startServer, 3000)
  })
  
  console.log(`Started server with PID ${server.pid}`)
}

startServer()

// Keep parent alive with a simple HTTP health check server on port 3001
const healthServer = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('OK')
})
healthServer.listen(3001, '0.0.0.0', () => {
  console.log('Health check server on 3001')
})

// Ignore SIGHUP
process.on('SIGHUP', () => console.log('Ignoring SIGHUP'))
