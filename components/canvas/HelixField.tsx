'use client';

import { useRef } from 'react';
import { useIsCoarse, useSketch } from '@/lib/hooks';

/**
 * One strand, made in three places.
 *
 * A double helix turning on its vertical axis, running the whole height of the
 * frame. It is a single continuous strand — the rules laid across it are what
 * divide it into three parts, not breaks in the thing itself.
 *
 * Each part is drawn in the palette of wherever it was made: ink and grey
 * throughout, and one accent that differs per part. The two parts whose accent
 * is *not* the studio's own **pulse**, each on its own beat, so the strand is
 * visibly out of time with itself. Scrolling brings every accent over to red,
 * one part at a time, and the pulse goes out with the colour it belonged to.
 *
 * Everything is a pure function of scroll progress, so scrolling back takes
 * the colours apart again and starts the pulse again. The turn is a separate,
 * always-running loop: one revolution a cycle, periodic by construction.
 */

export type HelixDriver = {
  progress: number;
  /** Where the two dividing rules sit, as fractions of the canvas height. */
  cuts: [number, number];
  /** Which part the reader is holding, if any. */
  hot: number | null;
};

/* When each part's accent resolves. Staggered, so the reader watches the
   system reach one part, then the next, rather than everything flipping. */
export const TURN = [
  { start: 0.1, span: 0.22 },
  { start: 0.34, span: 0.22 },
  { start: 0.58, span: 0.22 },
];

/** Where each part's text is re-cut: a little past the middle of its turn. */
export const SWAP = TURN.map((t) => t.start + t.span * 0.55);
/** Where all three are done. */
export const RESOLVED = TURN[2].start + TURN[2].span;

type RGB = [number, number, number];

const INK: RGB = [10, 10, 10];
const ACCENT: RGB[] = [
  [255, 42, 26],
  [47, 79, 216],
  [14, 138, 85],
];
const RED = ACCENT[0];

/* Neutral grey, passed through on the way over. Interpolating straight from
   blue to red runs through violet — a fourth colour that belongs to neither
   palette. Draining to grey first reads as the old one leaving and the
   studio's own arriving, which is what is actually happening. */
const NEUTRAL: RGB = [122, 122, 118];

/** Each wrong part keeps its own beat. Nothing here is in time with anything. */
const BEAT = [0, 1580, 2130];
const OFFSET = [0, 0, 0.9];

const TAU = Math.PI * 2;
const CYCLE = 30000;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (v: number) => v * v * (3 - 2 * v);
const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
const lerp = (a: RGB, b: RGB, k: number): RGB => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];
const blend = (a: RGB, b: RGB, k: number): RGB =>
  k < 0.5 ? lerp(a, NEUTRAL, k * 2) : lerp(NEUTRAL, b, (k - 0.5) * 2);

const turnOf = (i: number, p: number) => ease(clamp01((p - TURN[i].start) / TURN[i].span));
const isRed = (c: RGB) => c[0] === RED[0] && c[1] === RED[1] && c[2] === RED[2];

/* A part whose accent is already the studio's own never changes and never
   drains — putting it through the neutral would say it was wrong. */
const toneOf = (i: number, p: number): RGB =>
  isRed(ACCENT[i]) ? RED : blend(ACCENT[i], RED, turnOf(i, p));

/** The colour of one part at a given scroll position, as a hex string. */
export function partHex(i: number, p: number) {
  const c = toneOf(i, p);
  return `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

type Item = { z: number; draw: () => void };

export default function HelixField({
  driver,
  reduced = false,
}: {
  driver: React.RefObject<HelixDriver>;
  reduced?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const coarse = useIsCoarse();

  useSketch(
    ref,
    (ctx, w, h) => ctx.clearRect(0, 0, w, h),
    (ctx, t, w, h) => {
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);

      const d = driver.current;
      const p = clamp01(d?.progress ?? 0);
      const cuts = d?.cuts ?? [0.34, 0.67];
      const hot = d?.hot ?? null;

      /* Narrow frames get a shorter, coarser strand set nearer the edge: the
         same object, with less of it to draw and less of the measure taken. */
      const small = w < 780;
      const pairs = small ? 26 : 40;
      const turns = small ? 3 : 4;
      const axis = w * (small ? 0.87 : 0.775);
      const R = Math.min(w * (small ? 0.115 : 0.135), h * 0.115);
      const r0 = Math.max(2.6, Math.min(7.4, R * 0.17));
      const dim = small ? 0.66 : 1;

      const spin = reduced ? 0.7 : ((t % CYCLE) / CYCLE) * TAU;

      // How far each part has come to the one colour.
      const k = [turnOf(0, p), turnOf(1, p), turnOf(2, p)];
      const tone = ACCENT.map((_, i) => toneOf(i, p));
      /* The first length was already the studio's own colour, so it never
         pulses: red is what settled looks like. */
      const beat = k.map((kk, i) =>
        isRed(ACCENT[i]) || reduced
          ? 0
          : (1 - kk) * (0.5 + 0.5 * Math.sin((t / BEAT[i]) * TAU + OFFSET[i]))
      );
      const focus = (i: number) => (hot === null ? 1 : hot === i ? 1 : 0.24);

      const items: Item[] = [];
      const A: { x: number; y: number; z: number }[] = [];
      const B: { x: number; y: number; z: number }[] = [];

      for (let i = 0; i < pairs; i++) {
        const u = i / (pairs - 1);
        const y = h * u;
        const th = u * turns * TAU + spin;
        A.push({ x: axis + R * Math.sin(th), y, z: Math.cos(th) });
        B.push({ x: axis + R * Math.sin(th + Math.PI), y, z: Math.cos(th + Math.PI) });
      }

      const partOf = (u: number) => (u < cuts[0] ? 0 : u < cuts[1] ? 1 : 2);
      const near = (z: number) => (z + 1) / 2;

      ctx.lineCap = 'round';

      // Backbones, drawn as short pieces so each one can carry its own depth.
      for (let i = 0; i < pairs - 1; i++) {
        const u = (i + 0.5) / (pairs - 1);
        const part = partOf(u);
        const c = tone[part] as RGB;
        const f = focus(part) * dim;
        const lift = 1 + beat[part] * 0.34;
        [A, B].forEach((strand, si) => {
          const a = strand[i];
          const b = strand[i + 1];
          const z = (a.z + b.z) / 2;
          const n = near(z);
          const alpha = (0.2 + n * 0.62) * f * (si === 0 ? lift : 1);
          const col = si === 0 ? rgba(c, Math.min(1, alpha)) : rgba(INK, alpha * 0.7);
          const lw = (1.6 + n * 2.6) * (si === 0 ? lift : 1);
          items.push({
            z,
            draw: () => {
              ctx.strokeStyle = col;
              ctx.lineWidth = lw;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            },
          });
        });
      }

      // The rungs between the pairs. Always edge-on, so always in the middle.
      for (let i = 0; i < pairs; i++) {
        const a = A[i];
        const b = B[i];
        const u = i / (pairs - 1);
        const spread = Math.abs(a.x - b.x) / (R * 2);
        const alpha = (0.07 + spread * 0.2) * focus(partOf(u)) * dim;
        items.push({
          z: 0,
          draw: () => {
            ctx.strokeStyle = rgba(INK, alpha);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          },
        });
      }

      /* The bases. One side carries the accent, the other stays in ink. Near
         ones are cut out of the surface behind them so they read as beads on a
         line rather than dots printed over it. */
      for (let i = 0; i < pairs; i++) {
        const u = i / (pairs - 1);
        const part = partOf(u);
        const c = tone[part] as RGB;
        const f = focus(part) * dim;
        const lift = 1 + beat[part] * 0.5;
        [A, B].forEach((strand, si) => {
          const q = strand[i];
          const n = near(q.z);
          const rr = r0 * (0.52 + n * 0.66) * (si === 0 ? lift : 1);
          const alpha = Math.min(1, (0.34 + n * 0.66) * f * (si === 0 ? lift : 1));
          const col = si === 0 ? rgba(c, alpha) : rgba(INK, alpha * 0.78);
          items.push({
            z: q.z,
            draw: () => {
              if (n > 0.55) {
                ctx.strokeStyle = 'rgba(241,241,237,0.9)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(q.x, q.y, rr + 1, 0, TAU);
                ctx.stroke();
              }
              ctx.fillStyle = col;
              ctx.beginPath();
              ctx.arc(q.x, q.y, rr, 0, TAU);
              ctx.fill();
            },
          });
        });
      }

      items.sort((m, n) => m.z - n.z);
      for (const it of items) it.draw();

      /* A bracket on the part being held, so the reader can see which length
         of the strand the line they are on belongs to. */
      if (hot !== null) {
        const top = hot === 0 ? 0 : cuts[hot - 1] * h;
        const bot = hot === 2 ? h : cuts[hot] * h;
        const x = axis + R + r0 * 2.4;
        ctx.strokeStyle = rgba(tone[hot] as RGB, 0.9);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x - 7, top + 2);
        ctx.lineTo(x, top + 2);
        ctx.lineTo(x, bot - 2);
        ctx.lineTo(x - 7, bot - 2);
        ctx.stroke();
      }
    },
    [reduced, coarse],
    // A phone gets fewer frames and fewer device pixels for the same object.
    { fps: reduced ? 1 : coarse ? 30 : 40, dprCap: coarse ? 1.75 : 2 }
  );

  return (
    <canvas
      ref={ref}
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden="true"
    />
  );
}
