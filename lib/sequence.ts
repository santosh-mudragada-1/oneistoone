/**
 * Runs stage changes one at a time.
 *
 * A fast scroll crosses several stage boundaries within a few frames. Playing
 * each one as it arrives means every transition is killed a fraction of the
 * way into the next, which is what made these sections feel rushed rather than
 * quick — the reader saw six torn half-transitions instead of a sequence.
 *
 * So: let the running transition finish, remember only the *latest* stage the
 * reader has reached, then go straight there and skip whatever was passed on
 * the way. Every transition plays whole, and the section is never more than
 * one transition behind the scroll position.
 *
 * `play` is handed the destination, where it is coming from, and a `done` it
 * must call when the transition is finished — which is not necessarily when
 * its timeline ends, since these sections carry slower atmosphere tweens that
 * should not hold the next stage up.
 */
export function createSequencer(play: (to: number, from: number, done: () => void) => void) {
  let current = 0;
  let busy = false;
  let queued: number | null = null;

  const run = (to: number) => {
    busy = true;
    const from = current;
    current = to;
    play(to, from, () => {
      busy = false;
      const next = queued;
      queued = null;
      if (next !== null && next !== current) run(next);
    });
  };

  return {
    /** The stage on screen. */
    get index() {
      return current;
    },
    to(next: number) {
      if (next === (queued ?? current)) return;
      if (busy) {
        // Scrolled back to where we already are: nothing left to catch up on.
        queued = next === current ? null : next;
        return;
      }
      run(next);
    },
  };
}
