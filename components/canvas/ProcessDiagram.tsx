'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useSketch } from '@/lib/hooks';

/* Hand-placed so the path across the page is irregular — a route, not a
   timeline. Normalised to the canvas box. */
const NODES = [
  [0.08, 0.26],
  [0.27, 0.7],
  [0.45, 0.17],
  [0.62, 0.78],
  [0.78, 0.33],
  [0.92, 0.68],
] as const;

const PAPER = 'rgba(241,241,237,';
const RED = '#ff2a1a';

let MONO: string | null = null;
const monoFont = () => {
  if (!MONO) {
    MONO =
      getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() ||
      'monospace';
  }
  return MONO;
};

export default function ProcessDiagram({ stage }: { stage: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef(stage);
  const reveal = useRef({ v: 1 });

  useEffect(() => {
    stageRef.current = stage;
    reveal.current.v = 0;
    const tw = gsap.to(reveal.current, { v: 1, duration: 1.1, ease: 'power2.inOut' });
    return () => {
      tw.kill();
    };
  }, [stage]);

  useSketch(
    ref,
    (ctx, w, h) => ctx.clearRect(0, 0, w, h),
    (ctx, t, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const st = stageRef.current;
      const rv = reveal.current.v;
      const px = (i: number) => NODES[i][0] * w;
      const py = (i: number) => NODES[i][1] * h;

      /* Measurement ticks along the top and left edges. */
      ctx.strokeStyle = `${PAPER}0.13)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 28) {
        const long = x % 140 < 28;
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, long ? 12 : 6);
      }
      for (let y = 0; y < h; y += 28) {
        const long = y % 140 < 28;
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(long ? 12 : 6, y + 0.5);
      }
      ctx.stroke();

      /* Connections. Segments behind the active stage are settled; the
         current one draws in. */
      for (let i = 0; i < NODES.length - 1; i++) {
        if (i > st - 1) break;
        const p = i === st - 1 ? rv : 1;
        const x1 = px(i);
        const y1 = py(i);
        const x2 = px(i + 1);
        const y2 = py(i + 1);
        // Right-angle routing keeps it reading as a diagram, not a scribble.
        const midX = x1 + (x2 - x1) * 0.5;
        const path: [number, number][] = [
          [x1, y1],
          [midX, y1],
          [midX, y2],
          [x2, y2],
        ];

        let total = 0;
        for (let k = 1; k < path.length; k++) {
          total += Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]);
        }
        let budget = total * p;

        ctx.strokeStyle = i === st - 1 ? RED : `${PAPER}0.3)`;
        ctx.lineWidth = i === st - 1 ? 1.4 : 1;
        ctx.beginPath();
        ctx.moveTo(path[0][0], path[0][1]);
        for (let k = 1; k < path.length && budget > 0; k++) {
          const seg = Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]);
          const f = Math.min(1, budget / Math.max(seg, 0.0001));
          ctx.lineTo(
            path[k - 1][0] + (path[k][0] - path[k - 1][0]) * f,
            path[k - 1][1] + (path[k][1] - path[k - 1][1]) * f
          );
          budget -= seg;
        }
        ctx.stroke();
      }

      /* Nodes. */
      NODES.forEach((_, i) => {
        const x = px(i);
        const y = py(i);
        const isActive = i === st;
        const isPast = i < st;

        if (isActive) {
          const pulse = 1 + Math.sin(t / 420) * 0.16;
          ctx.strokeStyle = RED;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.arc(x, y, 17 * pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = RED;
          ctx.fillRect(x - 5, y - 5, 10, 10);

          // Position readout — the node is measured, like everything else.
          ctx.font = `9px ${monoFont()}`;
          ctx.fillStyle = `${PAPER}0.6)`;
          ctx.textBaseline = 'alphabetic';
          ctx.textAlign = x > w * 0.8 ? 'right' : 'left';
          const pad = x > w * 0.8 ? -12 : 12;
          ctx.fillText(
            `${String(Math.round(NODES[i][0] * 100)).padStart(3, '0')} : ${String(
              Math.round(NODES[i][1] * 100)
            ).padStart(3, '0')}`,
            x + pad,
            y + 4
          );
        } else if (isPast) {
          ctx.strokeStyle = `${PAPER}0.5)`;
          ctx.lineWidth = 1;
          ctx.strokeRect(x - 4.5, y - 4.5, 9, 9);
        } else {
          ctx.fillStyle = `${PAPER}0.22)`;
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    },
    []
  );

  return (
    <canvas
      ref={ref}
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden="true"
    />
  );
}
