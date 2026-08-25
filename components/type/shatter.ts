import s from './shatter.module.css';

/**
 * A word, in pieces.
 *
 * The word is cut into a grid of cells and every cell is a full copy of the
 * word clipped to its own rectangle — the same trick the band-shear uses, in
 * two directions instead of one. Scattered, the pieces are fragments of
 * letterforms rather than letters: cuts fall wherever they fall, through
 * stems and counters and the gaps between characters.
 *
 * The rig never styles type. Every tile inherits face, size, tracking, width
 * and colour from the host it is built into, so it can be laid exactly over
 * the real word and handed off to it without anything moving.
 */

export type Shatter = {
  set(text: string): void;
  /** 0 = pieces scattered, 1 = the word, whole and in register. */
  to(k: number): void;
  destroy(): void;
};

/** Cells overlap very slightly, or sub-pixel rounding leaves hairline gaps. */
const BLEED = 0.5;

/* Deterministic, not random: the same word breaks the same way every time. */
const dice = (n: number) => {
  const v = Math.sin(n * 91.73 + 13.1) * 43758.5453;
  return v - Math.floor(v);
};

export function createShatter(host: HTMLElement, rows = 5, cols = 7): Shatter {
  host.classList.add(s.field);

  let tiles: HTMLElement[] = [];
  let plan: { dx: number; dy: number; rot: number; order: number }[] = [];

  const cell = (r: number, c: number) => {
    const top = Math.max(0, (r / rows) * 100 - BLEED);
    const bottom = Math.max(0, 100 - ((r + 1) / rows) * 100 - BLEED);
    const left = Math.max(0, (c / cols) * 100 - BLEED);
    const right = Math.max(0, 100 - ((c + 1) / cols) * 100 - BLEED);
    return `inset(${top.toFixed(2)}% ${right.toFixed(2)}% ${bottom.toFixed(2)}% ${left.toFixed(2)}%)`;
  };

  const set = (text: string) => {
    tiles.forEach((el) => el.remove());
    tiles = [];
    plan = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const el = document.createElement('span');
        el.className = s.tile;
        el.textContent = text;
        el.style.clipPath = cell(r, c);
        // Turns in place rather than swinging around the whole word.
        el.style.transformOrigin = `${(((c + 0.5) / cols) * 100).toFixed(2)}% ${(
          ((r + 0.5) / rows) *
          100
        ).toFixed(2)}%`;
        host.appendChild(el);
        tiles.push(el);
        plan.push({
          dx: (dice(i * 3.1) - 0.5) * 2.2,
          dy: (dice(i * 5.7 + 11) - 0.5) * 1.6,
          rot: (dice(i * 7.3 + 23) - 0.5) * 26,
          // Mostly left to right — the order it would actually be set in.
          order: (c / Math.max(1, cols - 1)) * 0.72 + dice(i * 2.9 + 41) * 0.28,
        });
      }
    }
  };

  const to = (k: number) => {
    const em = parseFloat(getComputedStyle(host).fontSize) || 16;
    // How much of the assembly one piece waits out before it starts moving.
    const lead = 0.58;

    let front = -1;
    let latest = -1;
    const at: number[] = [];
    for (let i = 0; i < tiles.length; i++) {
      const t = Math.max(0, Math.min(1, k * (1 + lead) - plan[i].order * lead));
      at.push(t);
      // Marked once it is actually visible, so the live piece reads as red
      // rather than as a dark smudge on its way in.
      if (t > 0.3 && t < 0.995 && plan[i].order > latest) {
        latest = plan[i].order;
        front = i;
      }
    }

    for (let i = 0; i < tiles.length; i++) {
      const t = at[i];
      // Arrives quickly, then settles: a piece being placed, not floated in.
      const e = 1 - Math.pow(1 - t, 4);
      const away = 1 - e;
      const p = plan[i];
      const el = tiles[i];
      el.style.transform = `translate(${(p.dx * away * em).toFixed(2)}px, ${(
        p.dy *
        away *
        em
      ).toFixed(2)}px) rotate(${(p.rot * away).toFixed(2)}deg)`;
      el.style.opacity = t <= 0.001 ? '0' : Math.min(1, 0.2 + e * 1.5).toFixed(3);
      el.dataset.live = String(i === front);
    }
  };

  return {
    set,
    to,
    destroy() {
      tiles.forEach((el) => el.remove());
      tiles = [];
      host.classList.remove(s.field);
    },
  };
}
