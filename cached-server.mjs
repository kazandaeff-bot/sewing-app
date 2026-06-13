import { createServer } from 'http';
import next from 'next';

const port = parseInt(process.env.PORT || '3000');
const hostname = process.env.HOSTNAME || '0.0.0.0';

const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

// Cache for HTML responses
const htmlCache = new Map();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      
      // Only cache HTML page requests (not API or static files)
      const isHtmlRequest = !url.pathname.startsWith('/_next/') && 
                           !url.pathname.startsWith('/api/') &&
                           !url.pathname.includes('.');
      
      if (isHtmlRequest && htmlCache.has(url.pathname)) {
        const cached = htmlCache.get(url.pathname);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(cached);
        return;
      }
      
      // Handle with Next.js
      await handle(req, res, url);
      
      // Cache HTML responses
      if (isHtmlRequest && res.statusCode === 200) {
        // We can't easily cache the stream, but at least log
        console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname} -> ${res.statusCode}`);
      }
    } catch (err) {
      console.error('Error:', err.message);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}).catch(err => {
  console.error('Prepare error:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled:', err);
});
