const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
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

  let waitingPlayers = [];

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('find_match', (username) => {
      console.log(`User ${username} looking for a match`);
      waitingPlayers.push({ id: socket.id, username, socket });

      if (waitingPlayers.length >= 2) {
        const p1 = waitingPlayers.shift();
        const p2 = waitingPlayers.shift();
        const roomId = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        p1.socket.join(roomId);
        p2.socket.join(roomId);

        // Assign colors
        p1.socket.emit('match_found', { roomId, color: 'w', opponent: p2.username });
        p2.socket.emit('match_found', { roomId, color: 'b', opponent: p1.username });

        console.log(`Match created: ${p1.username} vs ${p2.username} in ${roomId}`);
      }
    });

    socket.on('move', (data) => {
      socket.to(data.room).emit('move', data.move);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      waitingPlayers = waitingPlayers.filter(p => p.id !== socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
