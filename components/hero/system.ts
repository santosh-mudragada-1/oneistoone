/**
 * The hero's whole visual system is twelve rectangles.
 *
 * They assemble into a constructed 1:1, then travel and stretch into the
 * twelve column rules the rest of the page is built on, then reconfigure into
 * a registration frame. Same twelve objects throughout — the identity is the
 * grid, which is the argument the studio's name makes.
 *
 * Geometry is expressed in module units. One unit is the side of the square
 * module, so proportions hold at any viewport and only `S` changes.
 */

export type Rect = { x: number; y: number; sx: number; sy: number };

export const MODULES = 12;

/** Mark bounding box in module units. */
export const MARK_W = 5.79;
export const MARK_H = 3;

/**
 * A constructed numeral one: flag, three stem modules, foot. Orthogonal only —
 * no diagonals — so the mark reads as built from the system rather than drawn.
 */
function digitOne(ox: number): Rect[] {
  return [
    { x: ox + 0.0, y: 0.0, sx: 0.62, sy: 0.34 }, // flag
    { x: ox + 0.62, y: 0.0, sx: 1.0, sy: 1.0 }, // stem — upper
    { x: ox + 0.62, y: 1.0, sx: 1.0, sy: 1.0 }, // stem — middle
    { x: ox + 0.62, y: 2.0, sx: 1.0, sy: 0.66 }, // stem — lower
    { x: ox + 0.0, y: 2.66, sx: 2.24, sy: 0.34 }, // foot
  ];
}

/** State 01 — MARK. */
export function markState(): Rect[] {
  return [
    ...digitOne(0),
    { x: 2.62, y: 0.95, sx: 0.52, sy: 0.52 }, // colon — upper
    { x: 2.62, y: 1.95, sx: 0.52, sy: 0.52 }, // colon — lower
    ...digitOne(3.55),
  ];
}

/**
 * State 02 — GRID. The twelve modules take the twelve column positions of the
 * page grid. Heights and offsets vary, so it reads as a modular column
 * composition rather than twelve identical rules — the identity resolving
 * into the structure the rest of the site is set on.
 */
const COL_H = [0.34, 0.62, 0.2, 0.88, 0.46, 0.72, 0.26, 0.58, 0.94, 0.38, 0.68, 0.22];
const COL_Y = [0.1, 0.24, 0.52, 0.06, 0.4, 0.16, 0.62, 0.3, 0.03, 0.48, 0.2, 0.7];

/* The band the columns live in. Holds them clear of the metadata above and
   the label and readout below — those are light type, and a white module
   behind them would erase them. */
const BAND_TOP = 0.13;
const BAND_H = 0.66;

export function gridState(wm: number, hm: number): Rect[] {
  const edge = wm * 0.03;
  const gutter = (wm - edge * 2) / MODULES;
  const w = gutter * 0.84;
  return Array.from({ length: MODULES }, (_, i) => ({
    x: edge + gutter * i + (gutter - w) / 2,
    y: hm * (BAND_TOP + COL_Y[i] * BAND_H),
    sx: w,
    sy: hm * COL_H[i] * BAND_H,
  }));
}

/**
 * State 03 — FRAME. A registration frame with corner ticks and a small stack
 * of rules, the composition the closing statement sits inside.
 */
export function frameState(wm: number, hm: number, hair: number): Rect[] {
  const i = 0.07;
  const x0 = wm * i;
  const y0 = hm * i;
  const w = wm * (1 - i * 2);
  const h = hm * (1 - i * 2);
  const tick = wm * 0.022;
  const bar = hair * 2;

  return [
    { x: x0, y: y0, sx: w, sy: bar }, // frame — top
    { x: x0 + w - bar, y: y0, sx: bar, sy: h }, // frame — right
    { x: x0, y: y0 + h - bar, sx: w, sy: bar }, // frame — bottom
    { x: x0, y: y0, sx: bar, sy: h }, // frame — left

    // Corner registration ticks, sitting just outside the frame.
    { x: x0 - tick * 1.4, y: y0 - tick * 1.4, sx: tick, sy: bar },
    { x: x0 + w + tick * 0.4, y: y0 - tick * 1.4, sx: tick, sy: bar },
    { x: x0 - tick * 1.4, y: y0 + h + tick * 0.4, sx: tick, sy: bar },
    { x: x0 + w + tick * 0.4, y: y0 + h + tick * 0.4, sx: tick, sy: bar },

    // A small stack of rules — the colophon block.
    { x: x0 + w * 0.68, y: y0 + h * 0.74, sx: w * 0.22, sy: bar },
    { x: x0 + w * 0.68, y: y0 + h * 0.78, sx: w * 0.16, sy: bar },
    { x: x0 + w * 0.68, y: y0 + h * 0.82, sx: w * 0.19, sy: bar },
    { x: x0 + w * 0.68, y: y0 + h * 0.86, sx: w * 0.11, sy: bar },
  ];
}

/**
 * The pre-reveal state: every module collapsed onto the crosshair the loading
 * sequence ends on, so the hero grows out of that mark rather than replacing
 * it.
 */
export function seedState(wm: number, hm: number): Rect[] {
  const cx = wm * 0.5;
  const cy = hm * 0.5;
  return Array.from({ length: MODULES }, () => ({
    x: cx,
    y: cy,
    sx: 0.001,
    sy: 0.001,
  }));
}

/** Where the red indicator sits in each state. */
export function redState(
  state: 0 | 1 | 2,
  wm: number,
  hm: number,
  hair: number,
  markX: number,
  markY: number
): Rect {
  if (state === 0) {
    // A short rule set under the mark's baseline.
    return { x: markX, y: markY + MARK_H + 0.34, sx: 0.62, sy: hair * 2 };
  }
  if (state === 1) {
    // One column reads as active.
    const edge = wm * 0.03;
    const gutter = (wm - edge * 2) / MODULES;
    return {
      x: edge + gutter * 8 + gutter * 0.42,
      y: hm * (BAND_TOP + COL_Y[8] * BAND_H - 0.03),
      sx: hair * 2,
      sy: hm * (COL_H[8] * BAND_H + 0.06),
    };
  }
  const i = 0.07;
  return { x: wm * i, y: hm * i, sx: wm * 0.09, sy: hair * 2 };
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  sx: lerp(a.sx, b.sx, t),
  sy: lerp(a.sy, b.sy, t),
});

/** Smooth, symmetric easing for the scrubbed morph. */
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
