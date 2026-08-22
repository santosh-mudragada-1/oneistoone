'use client';

import { useRef } from 'react';
import { useSketch } from '@/lib/hooks';
import { fbm } from '@/lib/noise';
import {
  buildHand,
  capsulePath,
  palmPath,
  POSE_OPEN,
  POSE_POINT,
  type Hand,
} from './handRig';

/**
 * The hero field: two hands reaching, drawn entirely in ASCII.
 *
 * The hands are solved as geometry and rendered into a small luminance
 * buffer; that buffer is then read once per cell and turned into characters.
 * So the hands are not an image with characters laid over them — the
 * characters *are* the hands, and the same sampling that draws them also
 * carries the ambient field around them. One system, one pass.
 *
 * Cost is held down by never changing canvas state per character. Cells are
 * bucketed by glyph and drawn in eight batches, the luminance is rebuilt at
 * 25fps (the hands move well under a pixel a frame) and the character grid
 * refreshes a third of its rows per frame, so per-frame cost stays even
 * rather than spiking.
 */

export type FieldDriver = {
  /** 0 during the load, 1 once the hands are live. */
  settle: number;
  /** Emergence from darkness, then overall presence. */
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

/* Character cell. Narrow and tall, the way monospace actually sets. */
const CW = 7;
const CH = 11;
/* Luminance buffer pixels per CSS px — supersampled, then box-filtered per
   cell, so a finger edge lands as a graded run of characters and not a stair. */
const FS = 0.25;
/* Rows refreshed per frame. */
const SLICES = 3;

/* Ordered by ink. The hands are read entirely through this ramp. */
const RAMP = ['.', ':', '-', '+', '=', '*', '0', '#'];

let MONO: string | null = null;
const monoFont = () => {
  if (!MONO) {
    MONO =
      getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() ||
      'monospace';
  }
  return MONO;
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

type Buf = {
  field: HTMLCanvasElement;
  fctx: CanvasRenderingContext2D;
  ascii: HTMLCanvasElement;
  actx: CanvasRenderingContext2D;
  fw: number;
  fh: number;
  cols: number;
  rows: number;
  lum: Uint8ClampedArray | null;
  /** Flat [x, y, x, y, …] per glyph, reused every pass so nothing is
   *  allocated in the draw loop. */
  hand: number[][];
  air: number[][];
};

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
  const lastField = useRef(-Infinity);
  /* The pointer the hands actually answer to, easing toward the real one. */
  const smooth = useRef({ x: 0.5, y: 0.5 });

  useSketch(
    ref,
    (_ctx, w, h) => {
      const cols = Math.max(2, Math.ceil(w / CW));
      const rows = Math.max(2, Math.ceil(h / CH));
      const fw = Math.max(2, Math.round(w * FS));
      const fh = Math.max(2, Math.round(h * FS));

      const field = document.createElement('canvas');
      field.width = fw;
      field.height = fh;
      const fctx = field.getContext('2d', { willReadFrequently: true })!;

      const ascii = document.createElement('canvas');
      ascii.width = Math.max(2, Math.round(w));
      ascii.height = Math.max(2, Math.round(h));
      const actx = ascii.getContext('2d')!;

      buf.current = {
        field,
        fctx,
        ascii,
        actx,
        fw,
        fh,
        cols,
        rows,
        lum: null,
        hand: RAMP.map(() => []),
        air: RAMP.map(() => []),
      };
      lastField.current = -Infinity;
      slice.current = 0;
    },
    (ctx, t, w, h) => {
      const b = buf.current;
      const d = driver.current;
      if (!b || !d) return;

      const small = w < 780;
      const time = reduced ? 0 : t;

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

      /* --- Pose ---------------------------------------------------------- */

      const conv = clamp01(d.converge);
      /* Idle breathing, damped away as the scroll takes over — two things
         driving the same gap would read as a fight. */
      const idle = 0.5 - 0.5 * Math.cos(t * 0.00042);
      const live = reduced ? 1 : d.settle;
      const reach = mix(0.04, mix(0.2 + idle * 0.5, 1, conv), live);

      const meetX = w * 0.5;
      const meetY = small ? h * 0.685 : h * 0.69;
      const palm = small ? Math.min(w * 0.36, h * 0.2) : Math.min(w * 0.135, h * 0.215);

      /* The nearer hand leans toward the pointer. Small — this is a response,
         not a control. */
      const cx = sm.x * w;
      const cy = sm.y * h;
      const lean = (side: number) => {
        if (reduced) return 0;
        const off = cx - meetX;
        const near = Math.max(0, 1 - Math.abs(off) / (w * 0.6));
        const own = Math.sign(off) === side ? near : near * 0.3;
        // Yields as the fingers close, so nothing can push them apart at the
        // moment they are supposed to be touching.
        return own * d.cursor * 18 * side * (1 - conv * 0.85);
      };
      const leanY = reduced ? 0 : (sm.y - 0.5) * d.cursor * 14 * (1 - conv * 0.85);

      /* At full convergence both index fingertips are asked for the same
         point, which is what makes them meet rather than approach. */
      const gap = mix(small ? w * 0.1 : w * 0.115, 0, conv) + (1 - live) * w * 0.05;
      const rise = mix(small ? h * 0.035 : h * 0.042, 0, conv);

      /* The moment of contact, marked in light rather than colour. */
      const contact = clamp01((conv - 0.8) / 0.2);

      const hands: Hand[] = [
        buildHand({
          pose: POSE_OPEN,
          tipX: meetX - gap * 0.5 + lean(-1),
          tipY: meetY + rise + leanY,
          scale: palm * 0.94,
          /* The two index fingers have to arrive at different angles or they
             fuse into a single rod at the moment they meet. This one comes up
             from below left; the other comes down from above right. */
          tilt: -0.2,
          mirror: 1,
          reach,
          t: time,
          seed: 0,
        }),
        buildHand({
          pose: POSE_POINT,
          tipX: meetX + gap * 0.5 + lean(1),
          tipY: meetY - rise + leanY * 0.7,
          scale: palm * 1.06,
          tilt: -0.24,
          mirror: -1,
          reach,
          t: time,
          seed: 2.4,
        }),
      ];

      /* --- Luminance ----------------------------------------------------- */

      if (t - lastField.current > 40) {
        lastField.current = t;
        drawHands(b, hands, w, h, d.presence, meetX, meetY, palm, contact);
        b.lum = b.fctx.getImageData(0, 0, b.fw, b.fh).data;
      }

      /* --- Characters ---------------------------------------------------- */

      paint(b, w, h, t, cx, cy, d, slice.current, reduced);
      slice.current = (slice.current + 1) % SLICES;

      /* --- Composite ------------------------------------------------------ */

      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = d.fade;
      ctx.drawImage(b.ascii, 0, 0, w, h);
      ctx.globalAlpha = 1;
    },
    [reduced],
    { dprCap: 1.5, fps: reduced ? 4 : undefined }
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

function drawHands(
  b: Buf,
  hands: Hand[],
  w: number,
  h: number,
  presence: number,
  mx: number,
  my: number,
  palm: number,
  contact: number
) {
  const f = b.fctx;
  f.setTransform(b.fw / w, 0, 0, b.fh / h, 0, 0);
  f.clearRect(0, 0, w, h);

  /* 1 — silhouette, one path for both hands. */
  f.globalCompositeOperation = 'source-over';
  f.fillStyle = '#6d6d6d';
  f.beginPath();
  hands.forEach((hand) => {
    palmPath(f, hand.palm);
    hand.segs.forEach((s) => capsulePath(f, s));
  });
  f.fill();

  /* 2 — broad form. Vertical, so a hand is exposed by its height in the frame
     and not by how far across it happens to sit. */
  f.globalCompositeOperation = 'source-atop';
  const form = f.createLinearGradient(0, h * 0.4, 0, h * 0.98);
  form.addColorStop(0, 'rgba(255,255,255,0.5)');
  form.addColorStop(0.45, 'rgba(255,255,255,0.04)');
  form.addColorStop(1, 'rgba(0,0,0,0.34)');
  f.fillStyle = form;
  f.fillRect(0, 0, w, h);

  /* 3 — cylindrical sheen per bone: a bright edge toward the light and a core
     shadow away from it, which is what makes a capsule read as a finger. */
  const LX = -0.5;
  const LY = -0.87;
  hands.forEach((hand) => {
    hand.segs.forEach((s) => {
      const dx = s.bx - s.ax;
      const dy = s.by - s.ay;
      const len = Math.hypot(dx, dy) || 1;
      let nx = -dy / len;
      let ny = dx / len;
      if (nx * LX + ny * LY < 0) {
        nx = -nx;
        ny = -ny;
      }
      const mx = (s.ax + s.bx) / 2;
      const my = (s.ay + s.by) / 2;
      const r = Math.max(s.ra, s.rb) * 1.05;
      const g = f.createLinearGradient(mx + nx * r, my + ny * r, mx - nx * r, my - ny * r);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.2, 'rgba(255,255,255,0.62)');
      g.addColorStop(0.52, 'rgba(255,255,255,0.06)');
      g.addColorStop(0.82, 'rgba(0,0,0,0.36)');
      g.addColorStop(1, 'rgba(0,0,0,0.14)');
      f.fillStyle = g;
      f.beginPath();
      capsulePath(f, s);
      f.fill();
    });
  });

  /* 4 — where the fingertips meet, the characters run up the ramp. The
     contact is marked by the field getting denser, not by anything arriving
     on top of it. */
  if (contact > 0.001) {
    const r = palm * 0.6;
    const g = f.createRadialGradient(mx, my, 0, mx, my, r);
    g.addColorStop(0, `rgba(255,255,255,${0.6 * contact})`);
    g.addColorStop(0.45, `rgba(255,255,255,${0.22 * contact})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    f.fillStyle = g;
    f.fillRect(mx - r, my - r, r * 2, r * 2);
  }

  /* 5 — the arms dissolve into the dark rather than being cropped by the
     frame. During the load the cut sits far inland, so the hands arrive out
     of blackness instead of fading up in place. */
  f.globalCompositeOperation = 'destination-out';
  const cut = mix(0.66, 0.075, presence) * w;
  const left = f.createLinearGradient(0, 0, cut, 0);
  left.addColorStop(0, 'rgba(0,0,0,1)');
  left.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  left.addColorStop(1, 'rgba(0,0,0,0)');
  f.fillStyle = left;
  f.fillRect(0, 0, cut, h);

  const right = f.createLinearGradient(w, 0, w - cut, 0);
  right.addColorStop(0, 'rgba(0,0,0,1)');
  right.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  right.addColorStop(1, 'rgba(0,0,0,0)');
  f.fillStyle = right;
  f.fillRect(w - cut, 0, cut, h);

  f.globalCompositeOperation = 'source-over';
  f.setTransform(1, 0, 0, 1, 0, 0);
}

function paint(
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
  const band = Math.ceil(b.rows / SLICES);
  const r0 = slice * band;
  const r1 = Math.min(b.rows, r0 + band);
  if (r1 <= r0) return;

  a.clearRect(0, r0 * CH, w, (r1 - r0) * CH);
  a.font = `${CH}px ${monoFont()}`;
  a.textBaseline = 'middle';
  a.textAlign = 'center';

  const hand = b.hand;
  const air = b.air;
  for (let i = 0; i < RAMP.length; i++) {
    hand[i].length = 0;
    air[i].length = 0;
  }

  const lum = b.lum;
  const drift = reduced ? 0 : t * 0.000018;
  const radius = w * 0.22;
  const sx = b.fw / w;
  const sy = b.fh / h;
  const last = RAMP.length - 1;

  for (let ry = r0; ry < r1; ry++) {
    const y = ry * CH + CH / 2;
    for (let rx = 0; rx < b.cols; rx++) {
      const x = rx * CW + CW / 2;

      /* Box-filter the luminance under this cell. Point-sampling turns a
         finger edge into a staircase; averaging turns it into a run of
         characters that grade into the dark. */
      let v = 0;
      if (lum) {
        const fx = (x * sx) | 0;
        const fy = (y * sy) | 0;
        let n = 0;
        for (let oy = -1; oy <= 1; oy++) {
          const py = fy + oy;
          if (py < 0 || py >= b.fh) continue;
          for (let ox = -1; ox <= 1; ox++) {
            const px = fx + ox;
            if (px < 0 || px >= b.fw) continue;
            const i = (py * b.fw + px) << 2;
            v += (lum[i] / 255) * (lum[i + 3] / 255);
            n++;
          }
        }
        if (n) v /= n;
      }

      if (v > 0.035) {
        // The hand itself, read straight off the luminance.
        const k = Math.pow(v > 1 ? 1 : v, 0.62);
        hand[Math.min(last, (k * RAMP.length) | 0)].push(x, y);
        continue;
      }

      /* Ambient signal. Barely there, and a little more awake around the
         pointer — something to find rather than something to notice. */
      const dx = (x - cx) / radius;
      const dy = (y - cy) / radius;
      const glow = d.cursor * Math.max(0, 1 - (dx * dx + dy * dy));
      const n = fbm(x * 0.0042 + drift, y * 0.0042 - drift * 0.6, 17, 3);
      const dens = n * 0.72 + glow * 0.7 - 0.4;
      if (dens <= 0.01) continue;
      air[Math.min(last, (dens * RAMP.length) | 0)].push(x, y);
    }
  }

  /* One fillStyle per glyph, not one per character: the state change is what
     costs, and there are eight of them instead of several thousand. */
  const lit = d.presence;
  for (let i = 0; i < RAMP.length; i++) {
    const pts = hand[i];
    if (!pts.length) continue;
    a.fillStyle = `rgba(241,241,237,${(0.3 + (i / last) * 0.7) * lit})`;
    for (let j = 0; j < pts.length; j += 2) a.fillText(RAMP[i], pts[j], pts[j + 1]);
  }
  for (let i = 0; i < RAMP.length; i++) {
    const pts = air[i];
    if (!pts.length) continue;
    a.fillStyle = `rgba(241,241,237,${(0.05 + (i / last) * 0.16) * d.ascii})`;
    for (let j = 0; j < pts.length; j += 2) a.fillText(RAMP[i], pts[j], pts[j + 1]);
  }
}
