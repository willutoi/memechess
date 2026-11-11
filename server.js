// Set the mode before loading Next.js so `npm start` always serves the build.
const dev = process.argv.includes('--dev');
process.env.NODE_ENV = dev ? 'development' : 'production';

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { registerMatchmaking } = require('./src/lib/matchmaking.cjs');

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    
    // Health check endpoint for keep-alive services (UptimeRobot etc.)
    if (parsedUrl.pathname === '/ping') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
      return;
    }
    
    handle(req, res, parsedUrl);
  });

  const io = new Server(server);

  registerMatchmaking(io);

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
