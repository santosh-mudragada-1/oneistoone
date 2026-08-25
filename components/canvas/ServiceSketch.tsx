'use client';

import { useRef } from 'react';
import { useSketch } from '@/lib/hooks';

const PAPER = '#f1f1ed';
const RED = '#ff2a1a';

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

/** 01 — DIGITAL: interface fragments assembling under a travelling cursor. */
function digital(ctx: CanvasRenderingContext2D, t: number, w: number, h: number) {
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

/** 02 — PRODUCT: a packaging dieline, its creases and its dimensions. */
function product(ctx: CanvasRenderingContext2D, t: number, w: number, h: number) {
  const pad = w * 0.1;
  const u = (w - pad * 2) / 12;
  ctx.lineWidth = 1;

  /* The net: a carton unfolded, panels on a modular grid. */
  const panels = [
    [3, 0, 3, 2],
    [0, 2, 3, 4],
    [3, 2, 3, 4],
    [6, 2, 3, 4],
    [9, 2, 3, 4],
    [3, 6, 3, 2],
  ];
  const lit = Math.floor(t / 900) % panels.length;

  panels.forEach((b, i) => {
    const x = pad + b[0] * u;
    const y = pad + b[1] * u;
    const bw = b[2] * u;
    const bh = b[3] * u;
    const on = i === lit;
    ctx.strokeStyle = on ? RED : PAPER;
    ctx.globalAlpha = on ? 1 : 0.42;
    ctx.strokeRect(x, y, bw, bh);
    if (on) {
      ctx.fillStyle = RED;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(x, y, bw, bh);
    }
  });

  /* Fold lines: the creases the panels turn on. */
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = PAPER;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  [2, 6].forEach((r) => {
    ctx.moveTo(pad, pad + r * u);
    ctx.lineTo(pad + 12 * u, pad + r * u);
  });
  [3, 6, 9].forEach((c) => {
    ctx.moveTo(pad + c * u, pad + 2 * u);
    ctx.lineTo(pad + c * u, pad + 6 * u);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  /* A dimension run under the net — the object is a measured thing. */
  const dy = pad + 9.1 * u;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.moveTo(pad, dy);
  ctx.lineTo(pad + 12 * u, dy);
  for (let i = 0; i <= 12; i += 3) {
    ctx.moveTo(pad + i * u, dy - 4);
    ctx.lineTo(pad + i * u, dy + 4);
  }
  ctx.stroke();

  // The measurement bracket travels the run.
  const sweep = (Math.sin(t / 2100) * 0.5 + 0.5) * 12;
  ctx.strokeStyle = RED;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(pad + sweep * u, dy - 7);
  ctx.lineTo(pad + sweep * u, dy + 7);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** 03 — SPACE: a plan, its circulation and the wayfinding running through. */
function space(ctx: CanvasRenderingContext2D, t: number, w: number, h: number) {
  const pad = w * 0.1;
  const iw = w - pad * 2;
  const X = (v: number) => pad + v * iw;
  const Y = (v: number) => pad + v * iw;

  /* Setting-out grid. */
  ctx.strokeStyle = PAPER;
  ctx.globalAlpha = 0.13;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    ctx.moveTo(X(i / 8), Y(0));
    ctx.lineTo(X(i / 8), Y(0.82));
    ctx.moveTo(X(0), Y((i / 8) * 0.82));
    ctx.lineTo(X(1), Y((i / 8) * 0.82));
  }
  ctx.stroke();

  /* Walls: heavy where they are structure, thin where they only divide. */
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 3;
  ctx.strokeRect(X(0), Y(0), iw, Y(0.82) - Y(0));

  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(X(0.42), Y(0));
  ctx.lineTo(X(0.42), Y(0.34));
  ctx.moveTo(X(0.42), Y(0.52));
  ctx.lineTo(X(0.42), Y(0.82));
  ctx.moveTo(X(0.42), Y(0.52));
  ctx.lineTo(X(1), Y(0.52));
  ctx.stroke();

  /* A door swing, which is what makes a plan read as a plan. */
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(X(0.42), Y(0.34), Y(0.52) - Y(0.34), 0, Math.PI / 2);
  ctx.stroke();

  /* Circulation: the route people actually take through the space. */
  const route: [number, number][] = [
    [0.08, 0.74],
    [0.24, 0.74],
    [0.24, 0.43],
    [0.66, 0.43],
    [0.66, 0.16],
    [0.9, 0.16],
  ];
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(X(route[0][0]), Y(route[0][1]));
  route.slice(1).forEach((q) => ctx.lineTo(X(q[0]), Y(q[1])));
  ctx.stroke();
  ctx.setLineDash([]);

  /* Wayfinding: a marker moving along the route at walking pace. */
  let total = 0;
  const segs = route.slice(1).map((q, i) => {
    const a = route[i];
    const d = Math.hypot(X(q[0]) - X(a[0]), Y(q[1]) - Y(a[1]));
    total += d;
    return { a, b: q, d };
  });
  let travel = ((t / 5200) % 1) * total;
  let mx = X(route[0][0]);
  let my = Y(route[0][1]);
  for (const sg of segs) {
    if (travel <= sg.d) {
      const f = travel / sg.d;
      mx = X(sg.a[0]) + (X(sg.b[0]) - X(sg.a[0])) * f;
      my = Y(sg.a[1]) + (Y(sg.b[1]) - Y(sg.a[1])) * f;
      break;
    }
    travel -= sg.d;
  }
  ctx.fillStyle = RED;
  ctx.globalAlpha = 1;
  ctx.fillRect(mx - 3.5, my - 3.5, 7, 7);

  /* Section mark: where the plan would be cut. */
  ctx.strokeStyle = RED;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(X(0), Y(0.93));
  ctx.lineTo(X(0.18), Y(0.93));
  ctx.moveTo(X(0.82), Y(0.93));
  ctx.lineTo(X(1), Y(0.93));
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** 04 — MARKETING & GROWTH: a loop that compounds, and what it returns. */
function growth(ctx: CanvasRenderingContext2D, t: number, w: number, h: number) {
  const pad = w * 0.12;
  const iw = w - pad * 2;
  ctx.lineWidth = 1.25;

  /* The loop: four stages, closed, because growth is a circuit and not a
     funnel that ends. */
  const box = { x: pad, y: pad + iw * 0.06, w: iw, h: iw * 0.5 };
  const nodes: [number, number][] = [
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x + box.w, box.y + box.h],
    [box.x, box.y + box.h],
  ];

  ctx.strokeStyle = PAPER;
  ctx.globalAlpha = 0.4;
  ctx.strokeRect(box.x, box.y, box.w, box.h);

  const per = 3400;
  const phase = (t % per) / per;
  const leg = Math.floor(phase * 4);
  const f = phase * 4 - leg;
  const a = nodes[leg];
  const b = nodes[(leg + 1) % 4];
  const px = a[0] + (b[0] - a[0]) * f;
  const py = a[1] + (b[1] - a[1]) * f;

  // The pulse going round, and the leg it has covered.
  ctx.strokeStyle = RED;
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(px, py);
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.fillRect(px - 3, py - 3, 6, 6);

  ctx.lineWidth = 1.25;
  nodes.forEach((n, i) => {
    ctx.strokeStyle = i === leg ? RED : PAPER;
    ctx.globalAlpha = i === leg ? 1 : 0.55;
    ctx.strokeRect(n[0] - 5, n[1] - 5, 10, 10);
  });

  /* What the loop returns: a run of bars, each one taller than the last. */
  const by = pad + iw * 0.92;
  const bars = 9;
  const bw = iw / bars;
  for (let i = 0; i < bars; i++) {
    const grow = Math.min(1, Math.max(0, phase * 5 - i * 0.35));
    const hh = (0.1 + (i / bars) ** 1.6 * 0.9) * iw * 0.26 * grow;
    ctx.fillStyle = i === bars - 1 ? RED : PAPER;
    ctx.globalAlpha = i === bars - 1 ? 0.9 : 0.26 + (i / bars) * 0.4;
    ctx.fillRect(pad + i * bw + 1, by - hh, bw - 3, hh);
  }

  ctx.strokeStyle = PAPER;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(pad, by + 0.5);
  ctx.lineTo(pad + iw, by + 0.5);
  ctx.stroke();
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
  /* The cursor-following plate is always inside the viewport, so the
     intersection gate never pauses it — it has to be told when it is idle. */
  const runningRef = useRef(running);
  modeRef.current = mode;
  runningRef.current = running;

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
      /* One artwork per discipline, in the order the list sets them. */
      switch (modeRef.current) {
        case 1:
          digital(ctx, t, w, h);
          break;
        case 2:
          product(ctx, t, w, h);
          break;
        case 3:
          space(ctx, t, w, h);
          break;
        case 4:
          growth(ctx, t, w, h);
          break;
        default:
          brand(ctx, t, w, h);
      }
    },
    []
  );

  return <canvas ref={ref} style={{ width: '100%', height: '100%' }} aria-hidden="true" />;
}
