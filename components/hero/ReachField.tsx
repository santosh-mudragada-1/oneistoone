'use client';

import { useRef } from 'react';
import { useSketch } from '@/lib/hooks';
import { fbm, hash2 } from '@/lib/noise';
import { buildHand, capsulePath, palmPath, type Hand } from './handRig';

/**
 * The hero field: two hands reaching, and the ASCII they disturb.
 *
 * One low-resolution buffer carries the hands as a luminance field. It is
 * dithered into the halftone you see, and it is *also* what the ASCII pass
 * samples for density — so the characters genuinely thicken where a hand is
 * rather than being composited near one. Everything the cursor and the scroll
 * do is applied to the hands in world space, which means the field follows
 * for free.
 *
 * Cost is kept flat by never touching a DOM node per character: the hands
 * redraw at 30fps (they move less than a pixel a frame), the ASCII refreshes
 * a third of its rows per frame, and the visible canvas only ever composites
 * two bitmaps.
 */

export type FieldDriver = {
  /** 0 during the load, 1 once the hands are live. */
  settle: number;
  /** Emergence from darkness, then hand opacity. */
  presence: number;
  /** ASCII field visibility, set by the entrance. */
  ascii: number;
  /** Scroll fade for the whole field, set by the scroll. */
  fade: number;
  /** Extra px the hands pull apart — scroll. */
  spread: number;
  /** Cursor position over the hero, 0..1. */
  px: number;
  py: number;
  /** How much the cursor is allowed to influence. */
  cursor: number;
};

/** Halftone dot pitch, CSS px. Also the resolution of the hand buffer. */
const CELL = 3.5;
/** ASCII character pitch, CSS px. */
const ACELL = 15;
/** Rows refreshed per frame, as a fraction. */
const SLICES = 3;

/* Ordered by ink, lightest first. */
const RAMP = ['.', ':', '/', '+', '*', '0', '1', '#'];

/* 4×4 ordered dither. Threshold per pixel, so a slowly moving edge crawls in
   dots rather than sliding as a hard line. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((r) => r.map((v) => (v + 0.5) / 16));

type Buf = {
  field: HTMLCanvasElement;
  fctx: CanvasRenderingContext2D;
  dith: HTMLCanvasElement;
  dctx: CanvasRenderingContext2D;
  img: ImageData;
  ascii: HTMLCanvasElement;
  actx: CanvasRenderingContext2D;
  fw: number;
  fh: number;
  lum: Uint8ClampedArray | null;
};

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

export default function ReachField({
  driver,
  reduced,
}: {
  driver: React.RefObject<FieldDriver>;
  reduced: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  // Offscreen buffers, rebuilt on resize.
  const buf = useRef<Buf | null>(null);

  const slice = useRef(0);
  const lastHands = useRef(-Infinity);

  useSketch(
    ref,
    (_ctx, w, h) => {
      const fw = Math.max(2, Math.ceil(w / CELL));
      const fh = Math.max(2, Math.ceil(h / CELL));

      const field = document.createElement('canvas');
      field.width = fw;
      field.height = fh;
      const fctx = field.getContext('2d', { willReadFrequently: true })!;

      const dith = document.createElement('canvas');
      dith.width = fw;
      dith.height = fh;
      const dctx = dith.getContext('2d')!;

      const ascii = document.createElement('canvas');
      ascii.width = Math.max(2, Math.round(w));
      ascii.height = Math.max(2, Math.round(h));
      const actx = ascii.getContext('2d')!;

      buf.current = {
        field,
        fctx,
        dith,
        dctx,
        img: dctx.createImageData(fw, fh),
        ascii,
        actx,
        fw,
        fh,
        lum: null,
      };
      lastHands.current = -Infinity;
      slice.current = 0;
    },
    (ctx, t, w, h) => {
      const b = buf.current;
      const d = driver.current;
      if (!b || !d) return;

      const small = w < 780;

      /* --- Pose ---------------------------------------------------------- */

      /* The reach breathes on a ~15s cycle, starting at the bottom of the
         curve so the first thing the hands do after the load is move toward
         each other. `settle` blends the load pose into it. */
      const idle = 0.5 - 0.5 * Math.cos(t * 0.00042);
      const reach = mix(0.04, 0.18 + idle * 0.82, reduced ? 1 : d.settle);
      const time = reduced ? 0 : t;

      /* The gesture holds its own band under the type rather than sharing the
         line with it — the two competing for the same pixels is what made the
         first pass unreadable. */
      const meetX = small ? w * 0.52 : w * 0.615;
      const meetY = small ? h * 0.745 : h * 0.73;
      const palm = small ? Math.min(w * 0.27, h * 0.16) : Math.min(w * 0.13, h * 0.21);

      /* The cursor leans a hand toward it — a few px, well under the reach
         cycle, so it registers as response rather than as a control. */
      const cx = d.px * w;
      const cy = d.py * h;
      const lean = (side: number) => {
        if (reduced) return 0;
        const dx = cx - meetX;
        // Only the hand the pointer is nearest answers to it.
        const near = Math.max(0, 1 - Math.abs(dx) / (w * 0.55));
        return Math.sign(dx) === side ? near * d.cursor * 16 * side : 0;
      };

      // Reaching closes the gap; scrolling away opens it.
      const gap = mix(w * 0.068, w * 0.015, reach) + d.spread;
      const sag = (1 - reach) * h * 0.012;

      const hands: Hand[] = [
        buildHand({
          tipX: meetX - gap * 0.5 + lean(-1),
          tipY: meetY + h * 0.028 + sag,
          scale: palm * 0.9,
          tilt: -0.12,
          mirror: 1,
          reach,
          t: time,
          seed: 0,
        }),
        buildHand({
          tipX: meetX + gap * 0.5 + lean(1),
          tipY: meetY - h * 0.026 - sag * 0.7,
          scale: palm * 1.07,
          tilt: 0.06,
          mirror: -1,
          reach,
          t: time,
          seed: 2.4,
        }),
      ];

      /* --- Hands: luminance, then dither ---------------------------------- */

      // They move well under a pixel a frame; 30fps is indistinguishable.
      if (t - lastHands.current > 33) {
        lastHands.current = t;
        drawHands(b, hands, w, h, d.presence);
        dither(b);
      }

      /* --- ASCII: a third of the rows, every frame ------------------------ */

      if (d.ascii * d.fade > 0.001) {
        paintAscii(b, w, h, t, cx, cy, d, slice.current, reduced);
        slice.current = (slice.current + 1) % SLICES;
      }

      /* --- Composite ------------------------------------------------------ */

      ctx.clearRect(0, 0, w, h);

      // Hands first: chunky, unsmoothed, so the dither reads as print.
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = d.presence * 0.44 * d.fade;
      ctx.drawImage(b.dith, 0, 0, b.fw, b.fh, 0, 0, b.fw * CELL, b.fh * CELL);
      ctx.imageSmoothingEnabled = true;

      // Then the field over them, so the characters read as disturbed by the
      // hand rather than sitting behind it.
      ctx.globalAlpha = d.ascii * d.fade;
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

function drawHands(b: Buf, hands: Hand[], w: number, h: number, presence: number) {
  const f = b.fctx;
  f.setTransform(1 / CELL, 0, 0, 1 / CELL, 0, 0);
  f.clearRect(0, 0, w, h);

  /* 1 — silhouette, one path for both hands. */
  f.globalCompositeOperation = 'source-over';
  f.fillStyle = '#4f4f4f';
  f.beginPath();
  hands.forEach((hand) => {
    palmPath(f, hand.palm);
    hand.segs.forEach((s) => capsulePath(f, s));
  });
  f.fill();

  /* 2 — broad form. Vertical, so a hand is exposed by its height in the frame
     and not by how far across it happens to sit: a diagonal wash left the far
     hand two stops under the near one and broke it into unrelated pieces. */
  f.globalCompositeOperation = 'source-atop';
  const form = f.createLinearGradient(0, h * 0.42, 0, h * 0.98);
  form.addColorStop(0, 'rgba(255,255,255,0.42)');
  form.addColorStop(0.45, 'rgba(0,0,0,0.08)');
  form.addColorStop(1, 'rgba(0,0,0,0.46)');
  f.fillStyle = form;
  f.fillRect(0, 0, w, h);

  /* 3 — cylindrical sheen per bone. This is what makes a capsule read as a
     finger: a bright edge toward the light, a core shadow away from it. */
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
      g.addColorStop(0.2, 'rgba(255,255,255,0.6)');
      g.addColorStop(0.52, 'rgba(255,255,255,0.06)');
      g.addColorStop(0.82, 'rgba(0,0,0,0.34)');
      g.addColorStop(1, 'rgba(0,0,0,0.12)');
      f.fillStyle = g;
      f.beginPath();
      capsulePath(f, s);
      f.fill();
    });
  });

  /* 4 — the arms dissolve into the dark rather than being cropped by the
     frame. During the load the cut sits far inland, so the hands arrive out
     of blackness instead of fading up in place. */
  f.globalCompositeOperation = 'destination-out';
  const cut = mix(0.66, 0.085, presence) * w;
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

function dither(b: Buf) {
  const src = b.fctx.getImageData(0, 0, b.fw, b.fh);
  const s = src.data;
  const out = b.img.data as Uint8ClampedArray;
  b.lum = s;

  for (let y = 0; y < b.fh; y++) {
    const row = BAYER[y & 3];
    for (let x = 0; x < b.fw; x++) {
      const i = (y * b.fw + x) << 2;
      // Premultiplied luminance, then a smoothstep so the midtones separate
      // into dots instead of turning into flat grey.
      let v = (s[i] / 255) * (s[i + 3] / 255);
      v = v * v * (3 - 2 * v);
      const on = v > row[x & 3];
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = on ? 255 : 0;
    }
  }
  b.dctx.putImageData(b.img, 0, 0);
}

function paintAscii(
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
  const cols = Math.ceil(w / ACELL);
  const rows = Math.ceil(h / ACELL);
  const band = Math.ceil(rows / SLICES);
  const r0 = slice * band;
  const r1 = Math.min(rows, r0 + band);

  a.clearRect(0, r0 * ACELL, w, (r1 - r0) * ACELL);
  a.font = `${Math.round(ACELL * 0.62)}px ${monoFont()}`;
  a.textBaseline = 'middle';
  a.textAlign = 'center';

  const drift = reduced ? 0 : t * 0.000018;
  const radius = w * 0.2;
  const lum = b.lum;

  for (let cy2 = r0; cy2 < r1; cy2++) {
    const y = cy2 * ACELL + ACELL / 2;
    for (let cx2 = 0; cx2 < cols; cx2++) {
      const x = cx2 * ACELL + ACELL / 2;

      // The hand, straight off the same buffer the halftone came from.
      let hand = 0;
      if (lum) {
        const fx = Math.min(b.fw - 1, (x / CELL) | 0);
        const fy = Math.min(b.fh - 1, (y / CELL) | 0);
        const i = (fy * b.fw + fx) << 2;
        hand = (lum[i] / 255) * (lum[i + 3] / 255);
      }

      // A slow abstract signal, so the field has shape of its own.
      const n = fbm(x * 0.0042 + drift, y * 0.0042 - drift * 0.6, 17, 3);

      // The pointer opens a soft window in the field.
      const dx = (x - cx) / radius;
      const dy = (y - cy) / radius;
      const glow = d.cursor * Math.max(0, 1 - (dx * dx + dy * dy));

      const dens = n * 0.72 + hand * 0.95 + glow * 0.62 - 0.32;
      if (dens <= 0.015) continue;

      const k = dens > 1 ? 1 : dens;
      const ch = RAMP[Math.min(RAMP.length - 1, (k * RAMP.length) | 0)];

      // Rare enough that finding one feels like finding something.
      if (k > 0.82 && hash2(cx2, cy2, 5) > 0.991) {
        a.fillStyle = `rgba(255,42,26,${(0.25 + k * 0.45).toFixed(3)})`;
      } else {
        a.fillStyle = `rgba(241,241,237,${(0.05 + k * 0.26).toFixed(3)})`;
      }
      a.fillText(ch, x, y);
    }
  }
}
