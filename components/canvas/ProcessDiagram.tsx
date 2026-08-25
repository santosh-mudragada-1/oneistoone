'use client';

import { useRef } from 'react';
import { useSketch } from '@/lib/hooks';

/* Four moves, hand-placed so the path across the page is irregular — a route,
   not a timeline. Normalised to the canvas box. */
const NODES = [
  [0.09, 0.24],
  [0.36, 0.74],
  [0.64, 0.2],
  [0.91, 0.66],
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

/**
 * Values the parent timeline writes to. Keeping them in a ref means the trail
 * and the destination dot are phases of one animation rather than two that can
 * drift apart.
 *
 * `leg` is the connection currently being drawn *or withdrawn* — leg `i` runs
 * from node `i` to node `i + 1`. Everything before it is settled, everything
 * after it has not been reached. Scrolling back sends `trail` from 1 to 0 on
 * the same leg it arrived on, so the line retreats the way it came instead of
 * vanishing and redrawing itself.
 */
export type DiagramDriver = { leg: number; trail: number; dot: number };

export default function ProcessDiagram({ driver }: { driver: React.RefObject<DiagramDriver> }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useSketch(
    ref,
    (ctx, w, h) => ctx.clearRect(0, 0, w, h),
    (ctx, t, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const leg = driver.current?.leg ?? -1;
      const trail = driver.current?.trail ?? 1;
      const dot = driver.current?.dot ?? 1;
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

      /* Connections. Everything behind the active leg is settled; the active
         leg is drawn only as far as `trail` currently reaches. */
      for (let i = 0; i <= leg && i < NODES.length - 1; i++) {
        const isLeg = i === leg;
        const p = isLeg ? trail : 1;
        if (p <= 0.001) continue;

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

        ctx.strokeStyle = isLeg ? RED : `${PAPER}0.3)`;
        ctx.lineWidth = isLeg ? 1.4 : 1;
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

        // The leading edge of the line, travelling either way.
        if (isLeg && p < 1) {
          const [hx, hy] = headOf(path, total * p);
          ctx.fillStyle = RED;
          ctx.fillRect(hx - 2, hy - 2, 4, 4);
        }
      }

      /* Nodes. Exactly one node is "current", and the two ends of the active
         leg hand that state to each other as `dot` travels — so it is never
         claimed by both, in either direction. */
      NODES.forEach((_, i) => {
        const x = px(i);
        const y = py(i);
        const presence = i === leg + 1 ? dot : i === leg ? 1 - dot : 0;

        if (presence > 0.001) {
          drawActive(ctx, x, y, presence, t, w, i, presence >= 0.999);
        }

        if (presence < 0.999) {
          ctx.globalAlpha = 1 - presence;
          if (i <= leg) {
            ctx.strokeStyle = `${PAPER}0.5)`;
            ctx.lineWidth = 1;
            ctx.strokeRect(x - 4.5, y - 4.5, 9, 9);
          } else {
            ctx.fillStyle = `${PAPER}0.22)`;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
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

/** Point along a polyline at the given arc length. */
function headOf(path: [number, number][], dist: number): [number, number] {
  let budget = dist;
  for (let k = 1; k < path.length; k++) {
    const seg = Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]);
    if (budget <= seg) {
      const f = budget / Math.max(seg, 0.0001);
      return [
        path[k - 1][0] + (path[k][0] - path[k - 1][0]) * f,
        path[k - 1][1] + (path[k][1] - path[k - 1][1]) * f,
      ];
    }
    budget -= seg;
  }
  return path[path.length - 1];
}

function drawActive(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  presence: number,
  t: number,
  w: number,
  i: number,
  settled: boolean
) {
  if (settled) {
    const pulse = 1 + Math.sin(t / 420) * 0.16;
    ctx.strokeStyle = RED;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, 17 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const size = 10 * presence;
  ctx.fillStyle = RED;
  ctx.fillRect(x - size / 2, y - size / 2, size, size);

  if (presence > 0.6) {
    ctx.font = `9px ${monoFont()}`;
    ctx.fillStyle = `${PAPER}${0.6 * ((presence - 0.6) / 0.4)})`;
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
  }
}
