'use client';

import { useRef } from 'react';
import { useSketch } from '@/lib/hooks';
import { fbm } from '@/lib/noise';
import { ASPECT, LEFT, RIGHT, type HandArt } from './handArt';

/**
 * The hero field: two ASCII hands reaching, and the signal they disturb.
 *
 * The hands are the artwork in `handArt.ts`, drawn character for character —
 * never resampled, never rasterised from a bitmap. That is what lets them
 * hold up at any size, which the procedural rig they replaced did not.
 *
 * Because the animation is pure translation, each hand is rastered into its
 * own small canvas once and then blitted at a whole-pixel offset every frame.
 * Steady-state cost is two `drawImage` calls; characters are only re-drawn
 * while the entrance is still revealing them. The ambient field around them
 * refreshes a third of its rows per frame and thickens near the hands by
 * sampling a distance field built from the artwork itself, so it reacts to
 * the hands rather than merely sharing a canvas with them.
 */

export type FieldDriver = {
  /** 0 during the load, 1 once the hands are live. */
  settle: number;
  /** Reveals each hand outward from its fingertip. */
  presence: number;
  /** Ambient field visibility. */
  ascii: number;
  /** Scroll: 0 apart, 1 index fingertips touching. */
  converge: number;
  /** Scroll: fades the whole field as the hero releases. */
  fade: number;
  /** Cursor position over the hero, 0..1. */
  px: number;
  py: number;
  /** How much the cursor is allowed to influence. */
  cursor: number;
};

/* Ambient characters, light to dark. Deliberately not the artwork's own
   alphabet — the field is a different material from the hands. */
const AIR = ['.', ':', '-', '+', '=', '*'];
/** Rows of ambient refreshed per frame. */
const SLICES = 3;
/** How far from the hands, in art cells, the field still feels them. */
const REACH = 9;

let MONO: string | null = null;
const monoFont = () => {
  if (!MONO) {
    MONO =
      getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() ||
      'monospace';
  }
  return MONO;
};

/* The face's own advance, as a fraction of its size. Assuming a value here
   makes characters overlap or gap: at 0.55 the glyphs ran 9% wider than their
   cell and the artwork smeared into solid bars. Measured once. */
let ADVANCE = 0;
const fontFor = (cellW: number, weight = 1) => {
  if (!ADVANCE) {
    const probe = document.createElement('canvas').getContext('2d')!;
    probe.font = `100px ${monoFont()}`;
    ADVANCE = probe.measureText('0').width / 100 || 0.6;
  }
  return `${((cellW / ADVANCE) * weight).toFixed(2)}px ${monoFont()}`;
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

type Plate = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  art: HandArt;
  /** Chamfer distance from inked cells, in cells. Viewport-independent. */
  dist: Float32Array;
  /** Whole pixels the plate is drawn at this frame. */
  ox: number;
  oy: number;
};

type Buf = {
  air: HTMLCanvasElement;
  actx: CanvasRenderingContext2D;
  cols: number;
  rows: number;
  plates: Plate[];
  cw: number;
  ch: number;
  /** Quantised reveal the plates were last rastered at. */
  step: number;
};

/** Two-pass chamfer transform — how far each cell is from any ink. */
function distanceField(art: HandArt): Float32Array {
  const { cols, rows } = art;
  const BIG = 1e6;
  const d = new Float32Array(cols * rows).fill(BIG);
  art.glyphs.forEach((g) => {
    for (let i = 0; i < g.cells.length; i += 2) d[g.cells[i + 1] * cols + g.cells[i]] = 0;
  });
  const at = (x: number, y: number) =>
    x < 0 || y < 0 || x >= cols || y >= rows ? BIG : d[y * cols + x];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      d[i] = Math.min(
        d[i],
        at(x - 1, y) + 1,
        at(x, y - 1) + 1,
        at(x - 1, y - 1) + 1.41,
        at(x + 1, y - 1) + 1.41
      );
    }
  for (let y = rows - 1; y >= 0; y--)
    for (let x = cols - 1; x >= 0; x--) {
      const i = y * cols + x;
      d[i] = Math.min(
        d[i],
        at(x + 1, y) + 1,
        at(x, y + 1) + 1,
        at(x + 1, y + 1) + 1.41,
        at(x - 1, y + 1) + 1.41
      );
    }
  return d;
}

/** Draws the artwork into its plate, revealed outward from the fingertip. */
function raster(p: Plate, cw: number, ch: number, reveal: number) {
  const c = p.ctx;
  c.clearRect(0, 0, p.canvas.width, p.canvas.height);
  c.textBaseline = 'middle';
  c.textAlign = 'center';

  p.art.glyphs.forEach((g) => {
    /* Weight and brightness both ride the character's own density.

       The size matters as much as the alpha. The artwork is a contour drawn
       in its heaviest characters with a scatter of light ones shading the
       interior; set every glyph at the same size and a run of `A` stays a row
       of separate specks instead of becoming a stroke, and the hand reads as
       texture rather than form. Heavy glyphs are set large enough to touch
       their neighbours and close the line. */
    c.font = fontFor(cw, 0.86 + g.ink * 0.5);
    c.fillStyle = `rgba(241,241,237,${(0.09 + Math.pow(g.ink, 1.6) * 0.91).toFixed(3)})`;
    for (let i = 0; i < g.dist.length; i++) {
      // Cells are sorted by distance from the fingertip, so the first one
      // past the cut ends the bucket.
      if (g.dist[i] > reveal) break;
      c.fillText(g.ch, g.cells[i * 2] * cw + cw / 2, g.cells[i * 2 + 1] * ch + ch / 2);
    }
  });
}

export default function ReachField({
  driver,
  reduced,
}: {
  driver: React.RefObject<FieldDriver>;
  reduced: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const buf = useRef<Buf | null>(null);
  const slice = useRef(0);
  const smooth = useRef({ x: 0.5, y: 0.5 });

  useSketch(
    ref,
    (_ctx, w, h) => {
      /* One knob for the whole composition: the character cell.

         It has to stay large enough that a character reads as a character,
         and small enough that a useful amount of each hand is on screen. The
         artwork is 135 cells wide, so on a phone the forearms always run off
         the frame — which is what an arm reaching in from outside should do
         anyway. The floor is set so the hand itself, wrist to fingertips,
         always fits. */
      const cw = Math.max(2.1, Math.min(5.7, w * 0.0036));
      const ch = cw / ASPECT;

      const plates = [LEFT, RIGHT].map((art) => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(art.cols * cw);
        canvas.height = Math.ceil(art.rows * ch);
        return {
          canvas,
          ctx: canvas.getContext('2d')!,
          art,
          dist: distanceField(art),
          ox: 0,
          oy: 0,
        };
      });

      const air = document.createElement('canvas');
      air.width = Math.max(2, Math.round(w));
      air.height = Math.max(2, Math.round(h));

      buf.current = {
        air,
        actx: air.getContext('2d')!,
        cols: Math.ceil(w / cw),
        rows: Math.ceil(h / ch),
        plates,
        cw,
        ch,
        step: -1,
      };
      slice.current = 0;
    },
    (ctx, t, w, h) => {
      const b = buf.current;
      const d = driver.current;
      if (!b || !d) return;

      const small = w < 780;
      const { cw, ch } = b;

      /* --- Pointer ------------------------------------------------------- */

      const sm = smooth.current;
      if (reduced) {
        sm.x = 0.5;
        sm.y = 0.5;
      } else {
        // Eased toward the pointer every frame rather than tracking it, so
        // the hands answer with weight instead of snapping.
        sm.x += (d.px - sm.x) * 0.045;
        sm.y += (d.py - sm.y) * 0.045;
      }

      /* --- Placement ----------------------------------------------------- */

      const conv = clamp01(d.converge);
      const live = reduced ? 1 : d.settle;
      /* Idle breathing, damped away as the scroll takes over — two things
         driving the same gap would read as a fight. */
      const idle = 0.5 - 0.5 * Math.cos(t * 0.00042);
      const drift = reduced ? 0 : mix(1, 0.15, conv) * idle * cw * 3;

      const meetX = w * 0.5;
      /* Low at rest, so the gesture sits clear beneath the type. As the
         scroll closes the hands the type is lifting away, and they rise into
         the space it leaves — the meeting lands on the optical centre rather
         than in the bottom third. */
      const meetY = (small ? h * 0.71 : h * 0.68) - conv * h * 0.1;

      const cx = sm.x * w;
      const cy = sm.y * h;
      const lean = (side: number) => {
        if (reduced) return 0;
        const off = cx - meetX;
        const near = Math.max(0, 1 - Math.abs(off) / (w * 0.6));
        const own = Math.sign(off) === side ? near : near * 0.3;
        // Yields as the fingers close, so nothing can push them apart at the
        // moment they are supposed to be touching.
        return own * d.cursor * 16 * side * (1 - conv * 0.85);
      };
      const leanY = reduced ? 0 : (sm.y - 0.5) * d.cursor * 12 * (1 - conv * 0.85);

      /* Convergence closes to a single character cell rather than to zero.
         Asked for the same point exactly, the two hands interpenetrate and the
         contact reads as a knot; one cell apart they read as touching. */
      const gap = mix(small ? w * 0.13 : w * 0.12, cw * 1.5, conv) + (1 - live) * w * 0.06;
      const rise = mix(small ? h * 0.04 : h * 0.05, 0, conv);

      const place = (p: Plate, tipX: number, tipY: number) => {
        // Whole pixels: a bitmap blitted at a fractional offset resamples,
        // and a resampled character stops being a character.
        p.ox = Math.round(tipX - p.art.tipCol * cw);
        p.oy = Math.round(tipY - p.art.tipRow * ch);
      };
      place(
        b.plates[0],
        meetX - gap * 0.5 + lean(-1) - drift,
        meetY + rise + leanY
      );
      place(
        b.plates[1],
        meetX + gap * 0.5 + lean(1) + drift,
        meetY - rise + leanY * 0.7
      );

      /* --- Hands: rastered only while the reveal is still moving ---------- */

      const reveal = reduced ? 1 : clamp01(d.presence);
      const step = Math.round(reveal * 48);
      if (step !== b.step) {
        b.step = step;
        b.plates.forEach((p) => raster(p, cw, ch, step / 48));
      }

      /* --- Ambient ------------------------------------------------------- */

      if (d.ascii * d.fade > 0.001) {
        paintAir(b, w, h, t, cx, cy, d, slice.current, reduced);
        slice.current = (slice.current + 1) % SLICES;
      }

      /* --- Composite ------------------------------------------------------ */

      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = d.fade * d.ascii;
      ctx.drawImage(b.air, 0, 0, w, h);
      ctx.globalAlpha = d.fade;
      b.plates.forEach((p) => ctx.drawImage(p.canvas, p.ox, p.oy));
      ctx.globalAlpha = 1;
    },
    [reduced],
    { dprCap: 2, fps: reduced ? 4 : undefined }
  );

  return (
    <canvas
      ref={ref}
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden="true"
    />
  );
}

/* -------------------------------------------------------------------------- */

function paintAir(
  b: Buf,
  w: number,
  h: number,
  t: number,
  cx: number,
  cy: number,
  d: FieldDriver,
  slice: number,
  reduced: boolean
) {
  const a = b.actx;
  const { cw, ch } = b;
  const band = Math.ceil(b.rows / SLICES);
  const r0 = slice * band;
  const r1 = Math.min(b.rows, r0 + band);
  if (r1 <= r0) return;

  a.clearRect(0, r0 * ch, w, (r1 - r0) * ch);
  a.font = fontFor(cw);
  a.textBaseline = 'middle';
  a.textAlign = 'center';

  const buckets: number[][] = AIR.map(() => []);
  const flow = reduced ? 0 : t * 0.000018;
  const radius = w * 0.22;
  const last = AIR.length - 1;

  for (let ry = r0; ry < r1; ry++) {
    const y = ry * ch + ch / 2;
    for (let rx = 0; rx < b.cols; rx++) {
      const x = rx * cw + cw / 2;

      /* How close this cell is to either hand, straight off the artwork's
         own distance field. This is what makes the field feel disturbed by
         the hands rather than merely drawn behind them. */
      let near = 0;
      for (let i = 0; i < b.plates.length; i++) {
        const p = b.plates[i];
        const ac = ((x - p.ox) / cw) | 0;
        const ar = ((y - p.oy) / ch) | 0;
        if (ac < 0 || ar < 0 || ac >= p.art.cols || ar >= p.art.rows) continue;
        const dist = p.dist[ar * p.art.cols + ac];
        if (dist < REACH) near = Math.max(near, 1 - dist / REACH);
      }

      const dx = (x - cx) / radius;
      const dy = (y - cy) / radius;
      const glow = d.cursor * Math.max(0, 1 - (dx * dx + dy * dy));
      const n = fbm(x * 0.0042 + flow, y * 0.0042 - flow * 0.6, 17, 3);

      const dens = n * 0.62 + near * 0.55 + glow * 0.6 - 0.4;
      if (dens <= 0.012) continue;
      buckets[Math.min(last, (dens * AIR.length) | 0)].push(x, y);
    }
  }

  /* One fillStyle per glyph, not one per character. */
  for (let i = 0; i < AIR.length; i++) {
    const pts = buckets[i];
    if (!pts.length) continue;
    a.fillStyle = `rgba(241,241,237,${(0.06 + (i / last) * 0.2).toFixed(3)})`;
    for (let j = 0; j < pts.length; j += 2) a.fillText(AIR[i], pts[j], pts[j + 1]);
  }
}
