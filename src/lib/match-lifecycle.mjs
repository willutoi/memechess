// Owns delayed work and result submission eligibility for one board instance.
export function createMatchLifecycle({ schedule = setTimeout, cancel = clearTimeout } = {}) {
  let generation = 0;
  let current = null;
  const pending = new Set();

  function clearPending() {
    for (const timer of pending) cancel(timer);
    pending.clear();
  }

  return {
    get current() { return current; },
    start(details = {}) {
      clearPending();
      current = { ...details, id: ++generation, active: true, outcome: null, moveCount: 0 };
      return current;
    },
    isCurrent(id) { return current?.id === id; },
    isActive(id = current?.id) { return Boolean(current?.active && current.id === id); },
    finish(outcome, id = current?.id) {
      if (!current?.active || current.id !== id) return null;
      current.active = false;
      current.outcome = outcome;
      clearPending();
      return current;
    },
    stop() {
      clearPending();
      if (current) current.active = false;
      current = null;
      generation++;
    },
    defer(callback, delay, id = current?.id) {
      if (!this.isActive(id)) return;
      const timer = schedule(() => {
        pending.delete(timer);
        if (this.isActive(id)) callback();
      }, delay);
      pending.add(timer);
    }
  };
}

export function getGameOutcome(game, playerColor) {
  if (!game.isGameOver()) return null;
  if (game.isDraw()) return 'draw';
  // At checkmate the player whose turn it is has lost, regardless of color.
  return game.turn() === playerColor ? 'loss' : 'win';
}
