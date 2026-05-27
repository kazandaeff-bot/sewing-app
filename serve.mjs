import { createServer } from 'http'
import { parse as parseUrl } from 'url'
import next from 'next'

const app = next({ dev: false, dir: '/home/z/my-project' })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parseUrl(req.url, true)
    handle(req, res, parsedUrl)
  })
  
  server.listen(3000, '0.0.0.0', () => {
    console.log('> Ready on http://0.0.0.0:3000')
  })
  
  server.on('error', (err) => {
    console.error('Server error:', err)
  })
  
  // Keep the process alive
  setInterval(() => {
    // heartbeat
  }, 60000)
  
  // Handle signals gracefully
  process.on('SIGHUP', () => console.log('Ignoring SIGHUP'))
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down')
    server.close(() => process.exit(0))
  })
})
