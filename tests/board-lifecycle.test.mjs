import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { Chess } from 'chess.js';
import * as lifecycle from '../src/lib/match-lifecycle.mjs';

const require = createRequire(import.meta.url);
const { transformSync } = require('next/dist/build/swc');
const { code } = transformSync(readFileSync(new URL('../src/components/MemeChessBoard.js', import.meta.url), 'utf8'), {
  jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } },
  module: { type: 'commonjs' }
});

// Exercise the real component callbacks and hook dependencies without a browser,
// replacing only React's scheduler, the network, audio, and wall-clock timers.
function mountBoard() {
  const hooks = [];
  let cursor = 0, dirty = true, tree, now = 0, nextTimer = 0;
  const effects = [], timers = new Map(), requests = [], random = [], socketEvents = new Map();
  const schedule = (callback, delay, repeat = false) => {
    const id = ++nextTimer;
    timers.set(id, { callback, delay, at: now + delay, repeat });
    return id;
  };
  const cancel = id => timers.delete(id);
  const changed = (a, b) => !a || !b || a.length !== b.length || a.some((value, i) => !Object.is(value, b[i]));
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!hooks[i]) hooks[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [hooks[i].value, value => {
        const next = typeof value === 'function' ? value(hooks[i].value) : value;
        if (!Object.is(next, hooks[i].value)) { hooks[i].value = next; dirty = true; }
      }];
    },
    useRef(initial) {
      const i = cursor++;
      if (!hooks[i]) hooks[i] = { current: initial };
      return hooks[i];
    },
    useMemo(factory, deps) {
      const i = cursor++;
      if (!hooks[i] || changed(hooks[i].deps, deps)) hooks[i] = { value: factory(), deps };
      return hooks[i].value;
    },
    useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
    useEffect(callback, deps) {
      const i = cursor++;
      if (!hooks[i] || changed(hooks[i].deps, deps)) {
        const previous = hooks[i];
        hooks[i] = { deps, cleanup: previous?.cleanup };
        effects.push(() => { previous?.cleanup?.(); hooks[i].cleanup = callback(); });
      }
    }
  };
  const socket = {
    on(name, fn) { socketEvents.set(name, fn); },
    emit() {},
    disconnect() { socketEvents.get('disconnect')?.(); }
  };
  const context = {
    exports: {}, console,
    require(name) {
      if (name === 'react') return react;
      if (name === 'howler') return { Howl: class { play() {} unload() {} } };
      if (name === 'socket.io-client') return { io: () => socket };
      if (name.endsWith('match-lifecycle.mjs')) return {
        ...lifecycle, createMatchLifecycle: () => lifecycle.createMatchLifecycle({ schedule, cancel })
      };
      return require(name);
    },
    setTimeout: schedule, clearTimeout: cancel,
    setInterval: (fn, delay) => schedule(fn, delay, true), clearInterval: cancel,
    Math: Object.assign(Object.create(Math), { random: () => random.shift() ?? 0 }),
    window: { innerWidth: 1000, dispatchEvent() {} },
    CustomEvent: class {},
    localStorage: { getItem: () => 'test-player' },
    fetch: async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ eloChange: 0, coinsGained: 0 }) };
    }
  };
  vm.runInNewContext(code, context);
  function render() {
    let attempts = 0;
    while (dirty) {
      if (++attempts > 20) throw new Error('Component render loop');
      dirty = false;
      cursor = 0;
      tree = context.exports.default({ username: 'test-player' });
      effects.splice(0).forEach(effect => effect());
    }
  }
  function nodes(value) {
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (!value || typeof value !== 'object') return [];
    return [value, ...nodes(value.props?.children)];
  }
  function text(value) {
    if (Array.isArray(value)) return value.map(text).join('');
    if (value && typeof value === 'object') return text(value.props?.children);
    return value == null ? '' : String(value);
  }
  render();
  return {
    requests,
    button(label) {
      const button = nodes(tree).find(node => node.type === 'button' && text(node).includes(label));
      assert.ok(button, `Missing button: ${label}`);
      button.props.onClick(); render();
    },
    move(from, to) {
      const target = nodes(tree).find(node => node.key === to && node.props?.onDrop);
      assert.ok(target, `Missing square: ${to}`);
      target.props.onDrop({ preventDefault() {}, dataTransfer: { getData: () => from } }); render();
    },
    click(square) {
      const target = nodes(tree).find(node => node.key === square && node.props?.onDrop);
      assert.ok(target, `Missing square: ${square}`);
      target.props.onClick(); render();
    },
    piece(square) {
      const node = nodes(tree).find(node => node.key === square && node.props?.onDrop);
      return nodes(node).find(child => child.type === 'img')?.props.alt;
    },
    chooseAI(game, san) {
      const moves = game.moves({ verbose: true });
      const index = moves.findIndex(move => move.san === san);
      assert.notEqual(index, -1);
      random.push((index + 0.1) / moves.length);
    },
    advance(ms) {
      const until = now + ms;
      while (true) {
        const next = [...timers].filter(([, task]) => task.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        const [id, task] = next;
        now = task.at;
        if (task.repeat) task.at += task.delay;
        else timers.delete(id);
        task.callback(); render();
      }
      now = until;
    },
    event(name, data) { socketEvents.get(name)?.(data); render(); },
    unmount() { hooks.forEach(hook => hook?.cleanup?.()); },
    text: () => text(tree)
  };
}

test('real board records AI mating a Black player as one loss', () => {
  const board = mountBoard();
  const game = new Chess();
  board.chooseAI(game, 'e4');
  board.button('Play Black'); board.advance(600); game.move('e4');
  game.move('f6'); board.chooseAI(game, 'd4');
  board.move('f7', 'f6'); board.advance(600); game.move('d4');
  game.move('g5'); board.chooseAI(game, 'Qh5#');
  board.move('g7', 'g5'); board.advance(600);
  assert.equal(board.requests.length, 1);
  assert.equal(board.requests[0].result, 'loss');
  assert.equal(board.requests[0].moveCount, 5);
  board.advance(10000);
  assert.equal(board.requests.length, 1);
  board.unmount();
});

test('timeout locks both drop and click move paths and submits once', () => {
  const board = mountBoard();
  board.button('Bullet'); board.button('Play White'); board.advance(60000);
  assert.equal(board.requests.length, 1);
  assert.equal(board.requests[0].result, 'loss');
  board.move('e2', 'e4'); board.advance(1000);
  board.click('d2'); board.click('d4');
  assert.equal(board.piece('e2'), 'wP');
  assert.equal(board.piece('e4'), undefined);
  assert.equal(board.piece('d2'), 'wP');
  assert.equal(board.requests.length, 1);
  board.unmount();
});

test('resigning before an AI response cannot overwrite the next match', () => {
  const board = mountBoard();
  board.button('Play Black'); board.button('Resign'); board.button('Play White');
  board.advance(1000);
  assert.equal(board.piece('a2'), 'wP');
  assert.equal(board.piece('a3'), undefined);
  assert.equal(board.requests.length, 1);
  board.unmount();
});

test('online receive handles mate/history and rejects stale-room moves', () => {
  const board = mountBoard();
  board.button('Play Online');
  board.event('match_found', { color: 'w', roomId: 'room-1', opponent: 'other' });
  board.event('move', { room: 'old-room', move: 'e4' });
  assert.equal(board.piece('e2'), 'wP');
  board.move('f2', 'f3'); board.event('move', { room: 'room-1', move: 'e5' });
  board.move('g2', 'g4'); board.event('move', { room: 'room-1', move: 'Qh4#' });
  assert.equal(board.requests.length, 1);
  assert.equal(board.requests[0].result, 'loss');
  assert.equal(board.requests[0].moveCount, 4);
  assert.ok(board.text().includes('Qh4#'));
  board.event('opponent_left', { roomId: 'room-1' });
  assert.equal(board.requests.length, 1);
  board.unmount();
});

test('unmount cancels scheduled AI before it can post an outcome', () => {
  const board = mountBoard();
  board.button('Play Black'); board.unmount(); board.advance(1000);
  assert.equal(board.requests.length, 0);
});
