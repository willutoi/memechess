const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { setTimeout: delay } = require('node:timers/promises');
const { Server } = require('socket.io');
const { io: connect } = require('socket.io-client');
const { registerMatchmaking } = require('../src/lib/matchmaking.cjs');

function event(socket, name) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(name, received);
      reject(new Error(`Timed out waiting for ${name}`));
    }, 2000);
    function received(data) {
      clearTimeout(timer);
      resolve(data);
    }
    socket.once(name, received);
  });
}

async function fixture(t, count = 3) {
  const server = createServer();
  const io = new Server(server);
  registerMatchmaking(io);
  io.on('connection', socket => socket.on('test_barrier', ack => ack()));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const clients = [];
  t.after(async () => {
    for (const client of clients) client.disconnect();
    await new Promise(resolve => io.close(resolve));
  });
  for (let i = 0; i < count; i++) {
    const client = connect(`http://127.0.0.1:${server.address().port}`, {
      transports: ['websocket'], forceNew: true, reconnection: false,
    });
    clients.push(client);
    await event(client, 'connect');
  }
  return clients;
}

function barrier(socket) {
  return new Promise((resolve, reject) => {
    socket.timeout(2000).emit('test_barrier', error => error ? reject(error) : resolve());
  });
}

async function match(first, second) {
  const firstMatch = event(first, 'match_found');
  const secondMatch = event(second, 'match_found');
  first.emit('find_match', 'Alice');
  await barrier(first);
  second.emit('find_match', 'Bob');
  const [a, b] = await Promise.all([firstMatch, secondMatch]);
  assert.equal(a.roomId, b.roomId);
  assert.equal(a.color, 'w');
  assert.equal(b.color, 'b');
  return a.roomId;
}

test('duplicate searches cannot pair a connection with itself', async t => {
  const [alice, bob] = await fixture(t, 2);
  const matches = [];
  alice.on('match_found', data => matches.push(data));
  alice.emit('find_match', 'Alice');
  alice.emit('find_match', 'Alice');
  await barrier(alice);
  assert.equal(matches.length, 0);

  const aliceMatch = event(alice, 'match_found');
  const bobMatch = event(bob, 'match_found');
  bob.emit('find_match', 'Bob');
  const [a, b] = await Promise.all([aliceMatch, bobMatch]);
  assert.equal(a.roomId, b.roomId);
  assert.equal(a.opponent, 'Bob');
  assert.equal(b.opponent, 'Alice');
  assert.equal(matches.length, 1);
});

test('cancelled and disconnected searches are removed from the queue', async t => {
  const [alice, bob, charlie, dana] = await fixture(t, 4);
  const matches = [];
  alice.on('match_found', data => matches.push(data));
  alice.emit('find_match', 'Alice');
  alice.emit('cancel_match');
  await barrier(alice);
  bob.emit('find_match', 'Bob');
  await barrier(bob);
  bob.disconnect();
  await delay(30);
  await match(charlie, dana);
  assert.equal(matches.length, 0);
});

test('moves are scoped to a current member and malformed payloads are ignored', async t => {
  const [alice, bob, outsider] = await fixture(t);
  const room = await match(alice, bob);
  const received = [];
  bob.on('move', data => received.push(data));
  outsider.emit('move', { room, move: 'e4' });
  alice.emit('move', null);
  alice.emit('move', { room, move: {} });
  alice.emit('move', { room, move: ' ' });
  alice.emit('move', { room: 'different-room', move: 'e4' });
  await Promise.all([barrier(alice), barrier(outsider)]);
  await delay(30);
  assert.deepEqual(received, []);

  const move = event(bob, 'move');
  alice.emit('move', { room, move: 'e4' });
  assert.deepEqual(await move, { room, move: 'e4' });
});

test('leaving releases both players and rejects old-room events', async t => {
  const [alice, bob, charlie] = await fixture(t);
  const oldRoom = await match(alice, bob);
  const left = event(bob, 'opponent_left');
  alice.emit('leave_match', { room: oldRoom });
  assert.deepEqual(await left, { roomId: oldRoom });

  const newRoom = await match(bob, charlie);
  assert.notEqual(newRoom, oldRoom);
  bob.emit('leave_match', { room: oldRoom });
  bob.emit('move', { room: oldRoom, move: 'e4' });
  await barrier(bob);
  const move = event(charlie, 'move');
  bob.emit('move', { room: newRoom, move: 'e4' });
  assert.deepEqual(await move, { room: newRoom, move: 'e4' });
});

test('disconnect notifies the opponent and permits matching again', async t => {
  const [alice, bob, charlie] = await fixture(t);
  const room = await match(alice, bob);
  const left = event(bob, 'opponent_left');
  alice.disconnect();
  assert.deepEqual(await left, { roomId: room });
  await match(bob, charlie);
});
