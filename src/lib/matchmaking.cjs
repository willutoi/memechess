const { randomUUID } = require('node:crypto');

// In-memory matchmaking for the single Socket.IO server. Chess moves are still
// validated by the board; this layer only routes messages between room members.
function registerMatchmaking(io) {
  const waiting = new Map();
  const rooms = new Map();
  const playerRooms = new Map();

  function leaveMatch(socket) {
    waiting.delete(socket.id);
    const roomId = playerRooms.get(socket.id);
    if (!roomId) return;

    const members = rooms.get(roomId) || [];
    rooms.delete(roomId);
    for (const id of members) {
      playerRooms.delete(id);
      const member = io.sockets.sockets.get(id);
      member?.leave(roomId);
      if (id !== socket.id) member?.emit('opponent_left', { roomId });
    }
  }

  io.on('connection', (socket) => {
    socket.on('find_match', (username) => {
      if (typeof username !== 'string' || !username.trim() || username.length > 80) return;
      if (!socket.connected || waiting.has(socket.id) || playerRooms.has(socket.id)) return;

      waiting.set(socket.id, { socket, username: username.trim() });
      for (const [id, player] of waiting) {
        if (!player.socket.connected) waiting.delete(id);
      }
      if (waiting.size < 2) return;

      const [p1, p2] = waiting.values();
      waiting.delete(p1.socket.id);
      waiting.delete(p2.socket.id);
      const roomId = `room_${randomUUID()}`;
      const players = [p1, p2];
      rooms.set(roomId, players.map(player => player.socket.id));
      for (const player of players) {
        playerRooms.set(player.socket.id, roomId);
        player.socket.join(roomId);
      }
      p1.socket.emit('match_found', { roomId, color: 'w', opponent: p2.username });
      p2.socket.emit('match_found', { roomId, color: 'b', opponent: p1.username });
    });

    socket.on('cancel_match', () => waiting.delete(socket.id));

    socket.on('leave_match', (data) => {
      if (data?.room !== undefined && data.room !== playerRooms.get(socket.id)) return;
      leaveMatch(socket);
    });

    socket.on('move', (data) => {
      if (!data || typeof data !== 'object' || typeof data.room !== 'string') return;
      if (typeof data.move !== 'string' || !data.move.trim() || data.move.length > 32) return;
      if (playerRooms.get(socket.id) !== data.room || !socket.rooms.has(data.room)) return;
      socket.to(data.room).emit('move', { room: data.room, move: data.move });
    });

    socket.on('disconnect', () => leaveMatch(socket));
  });
}

module.exports = { registerMatchmaking };
