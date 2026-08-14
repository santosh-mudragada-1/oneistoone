'use client';

import { useEffect, useRef } from 'react';
import { useSketch } from '@/lib/hooks';

const PAPER = '#f1f1ed';
const RED = '#ff2a1a';

/* next/font generates hashed family names, so canvas has to read the resolved
   values rather than the CSS variable — ctx.font cannot use var(). */
let FONTS: { display: string; mono: string } | null = null;
function fonts() {
  if (!FONTS) {
    const cs = getComputedStyle(document.documentElement);
    FONTS = {
      display: cs.getPropertyValue('--font-archivo').trim() || 'sans-serif',
      mono: cs.getPropertyValue('--font-mono').trim() || 'monospace',
    };
  }
  return FONTS;
}

/** Deterministic per-cell hash so the modular marks are stable, not flickering. */
const hash = (x: number, y: number, seed: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
};

/** 00 — BRAND: a modular mark system rebuilding itself on a square grid. */
function brand(ctx: CanvasRenderingContext2D, t: number, w: number, h: number) {
  const n = 5;
  const pad = w * 0.12;
  const cell = (w - pad * 2) / n;
  const seed = Math.floor(t / 1400);
  const phase = (t / 1400) % 1;

  ctx.lineWidth = 1.25;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const r = hash(x, y, seed);
      const rNext = hash(x, y, seed + 1);
      const k = r + (rNext - r) * Math.min(1, phase * 4);
      const cx = pad + x * cell;
      const cy = pad + y * cell;
      const m = cell * 0.16;
      const isRed = hash(x, y, seed + 7) > 0.9;

      ctx.strokeStyle = isRed ? RED : PAPER;
      ctx.fillStyle = isRed ? RED : PAPER;
      ctx.globalAlpha = 0.35 + r * 0.65;

      const s = cell - m * 2;
      const px = cx + m;
      const py = cy + m;

      ctx.beginPath();
      if (k < 0.2) {
        ctx.arc(px + s / 2, py + s / 2, s / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (k < 0.4) {
        ctx.arc(px + s / 2, py + s / 2, s / 2, Math.PI, Math.PI * 2);
        ctx.fill();
      } else if (k < 0.58) {
        ctx.moveTo(px, py + s);
        ctx.lineTo(px + s, py);
        ctx.stroke();
      } else if (k < 0.74) {
        ctx.fillRect(px, py, s, s * 0.34);
      } else if (k < 0.88) {
        ctx.moveTo(px + s / 2, py);
        ctx.lineTo(px + s / 2, py + s);
        ctx.moveTo(px, py + s / 2);
        ctx.lineTo(px + s, py + s / 2);
        ctx.stroke();
      } else {
        ctx.strokeRect(px, py, s, s);
      }
    }
  }
  ctx.globalAlpha = 1;
}

/** 01 — PRODUCT: interface fragments assembling under a scan line. */
function product(ctx: CanvasRenderingContext2D, t: number, w: number, h: number) {
  const pad = w * 0.11;
  const iw = w - pad * 2;
  ctx.strokeStyle = PAPER;
  ctx.fillStyle = PAPER;
  ctx.lineWidth = 1;

  const blocks = [
    [0, 0, 1, 0.11],
    [0, 0.16, 0.42, 0.3],
    [0.47, 0.16, 0.53, 0.14],
    [0.47, 0.34, 0.53, 0.12],
    [0, 0.51, 1, 0.09],
    [0, 0.65, 0.3, 0.35],
    [0.34, 0.65, 0.66, 0.16],
  ];

  blocks.forEach((b, i) => {
    const appear = (Math.sin(t / 900 + i * 0.7) + 1) / 2;
    ctx.globalAlpha = 0.22 + appear * 0.6;
    const x = pad + b[0] * iw;
    const y = pad + b[1] * iw;
    const bw = b[2] * iw;
    const bh = b[3] * iw;
    if (i === 3) {
      ctx.fillStyle = RED;
      ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = PAPER;
    } else {
      ctx.strokeRect(x, y, bw, bh);
      // Interface texture: a couple of content rules per block.
      ctx.globalAlpha *= 0.5;
      for (let l = 1; l < 3; l++) {
        const ly = y + (bh / 3) * l;
        if (ly < y + bh - 3) {
          ctx.beginPath();
          ctx.moveTo(x + 6, ly);
          ctx.lineTo(x + bw * (0.4 + ((i * 7 + l * 13) % 40) / 100), ly);
          ctx.stroke();
        }
      }
    }
  });

  // Cursor crosshair tracking a slow lissajous path.
  ctx.globalAlpha = 1;
  const cx = w / 2 + Math.sin(t / 1700) * iw * 0.36;
  const cy = h / 2 + Math.cos(t / 2300) * iw * 0.34;
  ctx.strokeStyle = RED;
  ctx.beginPath();
  ctx.moveTo(cx - 9, cy);
  ctx.lineTo(cx + 9, cy);
  ctx.moveTo(cx, cy - 9);
  ctx.lineTo(cx, cy + 9);
  ctx.stroke();
}

/** 02 — DIGITAL: halftone field driven by travelling wavefronts. */
function digital(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  px: number,
  py: number
) {
  const step = Math.max(9, w / 26);
  const mx = px * w;
  const my = py * h;
  const maxR = step * 0.46;

  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      const d = Math.hypot(x - w / 2, y - h / 2) / w;
      const wave = Math.sin(d * 14 - t / 620) * 0.5 + 0.5;
      const dm = Math.hypot(x - mx, y - my) / (w * 0.42);
      const lift = Math.max(0, 1 - dm) ** 2;
      const r = maxR * (0.16 + wave * 0.84) * (1 - lift * 0.85);
      if (r < 0.35) continue;
      ctx.fillStyle = wave > 0.93 ? RED : PAPER;
      ctx.globalAlpha = 0.35 + wave * 0.65;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/** 03 — MOTION: a word sliced into bands and displaced through a wave. */
function motion(ctx: CanvasRenderingContext2D, t: number, w: number, h: number) {
  const bands = 34;
  const bh = h / bands;
  ctx.font = `700 ${w * 0.28}px ${fonts().display}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < bands; i++) {
    const y = i * bh;
    const v = i / bands;
    const off = Math.sin(v * 6.2 + t / 480) * w * 0.14;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, w, bh + 0.6);
    ctx.clip();
    ctx.fillStyle = Math.abs(off) > w * 0.125 ? RED : PAPER;
    ctx.fillText('1:1', w / 2 + off, h / 2);
    ctx.restore();
  }

  // Registration rules that keep the deformation measurable.
  ctx.strokeStyle = PAPER;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = (h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** 04 — EXPERIMENTAL: ASCII rendering of a plasma field. */
const RAMP = ' .:-=+*#%@';

function experimental(ctx: CanvasRenderingContext2D, t: number, w: number, h: number) {
  const cell = Math.max(8, w / 30);
  ctx.font = `${cell * 1.05}px ${fonts().mono}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const tt = t / 1000;

  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      const u = x / w - 0.5;
      const v = y / h - 0.5;
      const d = Math.hypot(u, v);
      const n =
        Math.sin(u * 9 + tt) * 0.5 +
        Math.sin(v * 11 - tt * 0.8) * 0.5 +
        Math.sin(d * 18 - tt * 1.6) * 0.7;
      const lum = Math.min(0.999, Math.max(0, (n + 1.7) / 3.4));
      const idx = Math.floor(lum * RAMP.length);
      const ch = RAMP[idx];
      if (ch === ' ') continue;
      ctx.fillStyle = idx >= RAMP.length - 1 ? RED : PAPER;
      ctx.globalAlpha = 0.3 + lum * 0.7;
      ctx.fillText(ch, x, y);
    }
  }
  ctx.globalAlpha = 1;
}

export default function ServiceSketch({
  mode,
  running = true,
}: {
  mode: number;
  running?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const pointer = useRef({ x: 0.5, y: 0.5 });
  /* The cursor-following plate is always inside the viewport, so the
     intersection gate never pauses it — it has to be told when it is idle. */
  const runningRef = useRef(running);
  modeRef.current = mode;
  runningRef.current = running;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = e.clientX / window.innerWidth;
      pointer.current.y = e.clientY / window.innerHeight;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useSketch(
    ref,
    (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
    },
    (ctx, t, w, h) => {
      if (!runningRef.current) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
      switch (modeRef.current) {
        case 1:
          product(ctx, t, w, h);
          break;
        case 2:
          digital(ctx, t, w, h, pointer.current.x, pointer.current.y);
          break;
        case 3:
          motion(ctx, t, w, h);
          break;
        case 4:
          experimental(ctx, t, w, h);
          break;
        default:
          brand(ctx, t, w, h);
      }
    },
    []
  );

  return <canvas ref={ref} style={{ width: '100%', height: '100%' }} aria-hidden="true" />;
}
