import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { createMatchLifecycle, getGameOutcome } from '../src/lib/match-lifecycle.mjs';

function fakeClock() {
  const tasks = [];
  return {
    tasks,
    schedule(callback) { const task = { callback, cancelled: false }; tasks.push(task); return task; },
    cancel(task) { task.cancelled = true; }
  };
}

test('AI checkmate is a loss for either human color', () => {
  const blackMates = new Chess();
  ['f3', 'e5', 'g4', 'Qh4#'].forEach(move => blackMates.move(move));
  assert.equal(getGameOutcome(blackMates, 'w'), 'loss');
  assert.equal(getGameOutcome(blackMates, 'b'), 'win');

  const whiteMates = new Chess();
  ['e4', 'f6', 'd4', 'g5', 'Qh5#'].forEach(move => whiteMates.move(move));
  assert.equal(getGameOutcome(whiteMates, 'b'), 'loss');
  assert.equal(getGameOutcome(whiteMates, 'w'), 'win');
});

test('draw and unfinished positions do not become wins', () => {
  assert.equal(getGameOutcome(new Chess(), 'b'), null);
  assert.equal(getGameOutcome(new Chess('7k/8/5KQ1/8/8/8/8/8 b - - 0 1'), 'w'), 'draw');
});

test('timeout stops play and permits exactly one outcome', () => {
  const clock = fakeClock();
  const lifecycle = createMatchLifecycle(clock);
  const match = lifecycle.start();
  let moves = 0;
  lifecycle.defer(() => moves++, 600);
  assert.equal(lifecycle.finish('loss', match.id)?.outcome, 'loss');
  assert.equal(lifecycle.isActive(), false);
  assert.equal(lifecycle.finish('win', match.id), null);
  assert.equal(clock.tasks[0].cancelled, true);
  // Even a callback already queued by the runtime must be harmless.
  clock.tasks[0].callback();
  assert.equal(moves, 0);
});

test('reset/resign/unmount invalidates old work and late results', () => {
  const clock = fakeClock();
  const lifecycle = createMatchLifecycle(clock);
  const first = lifecycle.start();
  let moves = 0;
  lifecycle.defer(() => moves++, 600);
  lifecycle.stop();
  assert.equal(lifecycle.isCurrent(first.id), false);
  const next = lifecycle.start();
  clock.tasks[0].callback();
  assert.equal(moves, 0);
  assert.equal(lifecycle.finish('loss', first.id), null);
  assert.equal(lifecycle.isActive(next.id), true);
});

test('starting a new match cancels earlier AI and allows fresh work', () => {
  const clock = fakeClock();
  const lifecycle = createMatchLifecycle(clock);
  lifecycle.start({ room: 'old' });
  let moves = 0;
  lifecycle.defer(() => moves += 100, 600);
  lifecycle.start({ room: 'new' });
  lifecycle.defer(() => moves++, 600);
  clock.tasks.forEach(task => task.callback());
  assert.equal(moves, 1);
  assert.equal(lifecycle.current.room, 'new');
});
