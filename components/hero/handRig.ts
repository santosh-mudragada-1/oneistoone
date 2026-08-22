/**
 * A reaching hand, built rather than photographed.
 *
 * There is no stock image here. The hand is a small skeleton — a forearm, a
 * palm and five fingers of three phalanges each — solved with forward
 * kinematics and drawn as tapered capsules. That matters for more than
 * licensing: because the hand is geometry, the same buffer that renders it can
 * be sampled by the ASCII field, so the field genuinely reacts to the hand
 * instead of being composited near it.
 *
 * Everything is authored in palm-lengths with the wrist at the origin and the
 * fingers pointing along +x, so a hand survives any viewport by changing one
 * number. Angles are absolute rather than cumulative: what is written here is
 * the shape you get.
 */

export type Segment = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  ra: number;
  rb: number;
};

export type Hand = {
  segs: Segment[];
  palm: [number, number][];
  /** Middle fingertip — the leading point, and what the composition is
   *  built on. */
  tip: [number, number];
};

type Finger = {
  root: [number, number];
  lens: [number, number, number];
  /** Absolute joint angles at full reach. */
  base: [number, number, number];
  /** How far each joint folds back as the hand relaxes. */
  fold: [number, number, number];
  radii: [number, number, number, number];
  phase: number;
};

/* An open hand, relaxed, reaching. What makes it read as a hand and not as a
   paw is the fingertip arc: the middle finger is longest, the index sits back
   from it, and each finger droops a little more than the one before. The fan
   is wide enough that the four stay separate once they are dithered — merged
   fingers were the first pass's whole problem. */
const FINGERS: Finger[] = [
  {
    root: [0.99, -0.31],
    lens: [0.36, 0.21, 0.16],
    base: [-0.04, 0.04, 0.14],
    fold: [0.35, 0.45, 0.55],
    radii: [0.108, 0.095, 0.083, 0.066],
    phase: 0,
  },
  {
    root: [1.02, -0.08],
    lens: [0.38, 0.22, 0.17],
    base: [0.06, 0.16, 0.28],
    fold: [0.35, 0.45, 0.55],
    radii: [0.113, 0.1, 0.087, 0.07],
    phase: 1.9,
  },
  {
    root: [0.98, 0.14],
    lens: [0.35, 0.2, 0.15],
    base: [0.18, 0.32, 0.48],
    fold: [0.35, 0.45, 0.55],
    radii: [0.106, 0.093, 0.081, 0.065],
    phase: 3.4,
  },
  {
    root: [0.88, 0.33],
    lens: [0.27, 0.16, 0.12],
    base: [0.32, 0.5, 0.68],
    fold: [0.35, 0.45, 0.55],
    radii: [0.09, 0.078, 0.068, 0.055],
    phase: 5.1,
  },
  {
    root: [0.16, -0.34],
    lens: [0.42, 0.3, 0.21],
    base: [-0.62, -0.3, -0.02],
    fold: [0.2, 0.25, 0.3],
    radii: [0.16, 0.135, 0.108, 0.086],
    phase: 2.6,
  },
];

/* Long enough to always overshoot the frame, so the arm dissolves into the
   dark instead of ending in a rounded stub. Narrower than the palm at the
   wrist — a thick forearm is what turned the first pass into a whale. */
const FOREARM: [number, number, number][] = [
  [-3.5, 0.2, 0.4],
  [-1.9, 0.1, 0.34],
  [-0.7, 0.04, 0.3],
  [0, 0, 0.3],
];

const PALM: [number, number][] = [
  [-0.06, -0.38],
  [0.3, -0.4],
  [0.68, -0.41],
  [1.0, -0.38],
  [1.07, -0.1],
  [1.05, 0.14],
  [0.95, 0.36],
  [0.62, 0.45],
  [0.2, 0.43],
  [-0.06, 0.39],
];

/** Radians each joint travels between reaching and resting. */
const FOLD = 0.34;
/** Involuntary micro-movement. A hand held out is never actually still. */
const TREMOR = 0.011;

export type HandOptions = {
  /** Where the middle fingertip should land, in world px. */
  tipX: number;
  tipY: number;
  /** Palm length in px — the only thing that changes between viewports. */
  scale: number;
  tilt: number;
  mirror: 1 | -1;
  /** 0 resting, 1 fully extended. */
  reach: number;
  /** Milliseconds, for the tremor. */
  t: number;
  seed: number;
};

export function buildHand(o: HandOptions): Hand {
  // Solved once at the origin to find the tip, then again translated so the
  // fingertip lands exactly on the composition's anchor point whatever the
  // pose is doing.
  const probe = solve(o, 0, 0);
  return solve(o, o.tipX - probe.tip[0], o.tipY - probe.tip[1]);
}

function solve(o: HandOptions, ox: number, oy: number): Hand {
  const { scale, tilt, mirror, reach, t, seed } = o;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const closed = 1 - reach;

  const toWorld = (lx: number, ly: number): [number, number] => {
    const mx = lx * mirror * scale;
    const my = ly * scale;
    return [ox + mx * cos - my * sin, oy + mx * sin + my * cos];
  };

  const segs: Segment[] = [];
  const push = (a: [number, number], b: [number, number], ra: number, rb: number) => {
    const A = toWorld(a[0], a[1]);
    const B = toWorld(b[0], b[1]);
    segs.push({ ax: A[0], ay: A[1], bx: B[0], by: B[1], ra: ra * scale, rb: rb * scale });
  };

  for (let i = 1; i < FOREARM.length; i++) {
    const p = FOREARM[i - 1];
    const q = FOREARM[i];
    push([p[0], p[1]], [q[0], q[1]], p[2], q[2]);
  }

  let tip: [number, number] = [0, 0];

  FINGERS.forEach((f, fi) => {
    let x = f.root[0];
    let y = f.root[1];
    for (let j = 0; j < 3; j++) {
      // Absolute angle, folded back as the hand relaxes, plus a tremor that is
      // out of phase with every other finger.
      const a =
        f.base[j] +
        f.fold[j] * closed * FOLD +
        Math.sin(t * 0.00072 + f.phase + seed) * TREMOR * (j + 1) * 0.6;
      const nx = x + Math.cos(a) * f.lens[j];
      const ny = y + Math.sin(a) * f.lens[j];
      push([x, y], [nx, ny], f.radii[j], f.radii[j + 1]);
      x = nx;
      y = ny;
    }
    if (fi === 1) tip = toWorld(x, y);
  });

  return { segs, palm: PALM.map(([x, y]) => toWorld(x, y)), tip };
}

/** Closed quadratic spline through the palm points — no visible corners. */
export function palmPath(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  const n = pts.length;
  const mid = (a: [number, number], b: [number, number]) =>
    [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as [number, number];
  const start = mid(pts[n - 1], pts[0]);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) {
    const c = pts[i];
    const m = mid(c, pts[(i + 1) % n]);
    ctx.quadraticCurveTo(c[0], c[1], m[0], m[1]);
  }
  ctx.closePath();
}

/** Tapered capsule. Round caps at both ends, straight sides between. */
export function capsulePath(ctx: CanvasRenderingContext2D, s: Segment) {
  const a = Math.atan2(s.by - s.ay, s.bx - s.ax);
  ctx.moveTo(s.ax + Math.cos(a + Math.PI / 2) * s.ra, s.ay + Math.sin(a + Math.PI / 2) * s.ra);
  ctx.arc(s.ax, s.ay, s.ra, a + Math.PI / 2, a - Math.PI / 2);
  ctx.arc(s.bx, s.by, s.rb, a - Math.PI / 2, a + Math.PI / 2);
  ctx.closePath();
}
