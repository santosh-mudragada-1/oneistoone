'use client';

import { useEffect, useRef } from 'react';
import { SKETCHES } from '@/lib/experiments';
import { gsap } from '@/lib/gsap';
import { useSketch } from '@/lib/hooks';

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

export default function ExperimentCanvas({
  index,
  seed,
  active,
}: {
  index: number;
  seed: number;
  active: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0.5, y: 0.42 });
  const energy = useRef({ v: 0 });
  const seedRef = useRef(seed);
  seedRef.current = seed;

  /* Energy eases in and out so hovering feels like a dimmer, not a switch. */
  useEffect(() => {
    const tw = gsap.to(energy.current, {
      v: active ? 1 : 0,
      duration: active ? 0.7 : 1.2,
      ease: 'power2.out',
    });
    return () => {
      tw.kill();
    };
  }, [active]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.current.x = (e.clientX - r.left) / r.width;
      pointer.current.y = (e.clientY - r.top) / r.height;
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    return () => el.removeEventListener('pointermove', onMove);
  }, []);

  useSketch(
    ref,
    (ctx, w, h) => {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
    },
    (ctx, t, w, h) => {
      SKETCHES[index]({
        ctx,
        t,
        w,
        h,
        px: pointer.current.x,
        py: pointer.current.y,
        energy: energy.current.v,
        seed: seedRef.current,
        fonts: fonts(),
      });
    },
    [],
    // Several of these run at once during the horizontal scroll; 30fps is
    // indistinguishable for procedural texture and halves the fill cost.
    { fps: 30, dprCap: 1.5 }
  );

  return (
    <canvas
      ref={ref}
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden="true"
    />
  );
}
