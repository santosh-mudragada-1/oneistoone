'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useIsCoarse, useReducedMotion } from '@/lib/hooks';
import {
  MARK_H,
  MARK_W,
  MODULES,
  type Rect,
  clamp01,
  easeInOut,
  frameState,
  gridState,
  lerp,
  lerpRect,
  markState,
  redState,
  seedState,
} from './system';
import s from './HeroSystem.module.css';

/* Where each morph happens within the hero's scroll range. The gaps between
   them are deliberate holds — each form gets a moment to be read. */
const SEG = [
  { from: 0.16, to: 0.46 }, // mark  -> grid
  { from: 0.58, to: 0.88 }, // grid  -> frame
];

/** Each module travels over this share of a segment; the rest is its stagger. */
const SPAN = 0.62;
const STEP = (1 - SPAN) / (MODULES - 1);

export default function HeroSystem({
  ready,
  onState,
}: {
  ready: boolean;
  onState?: (index: 0 | 1 | 2) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const modsRef = useRef<HTMLDivElement[]>([]);
  const redRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<(() => void) | null>(null);
  const reduced = useReducedMotion();
  const coarse = useIsCoarse();

  const stateCb = useRef(onState);
  stateCb.current = onState;

  useEffect(() => {
    const stage = stageRef.current;
    const mods = modsRef.current.filter(Boolean);
    const red = redRef.current;
    if (!stage || mods.length !== MODULES || !red) return;

    /* --- Geometry, recomputed on resize -------------------------------- */
    let S = 1;
    let states: Rect[][] = [];
    let reds: Rect[] = [];
    let seed: Rect[] = [];

    const measure = () => {
      const w = stage.clientWidth || 1;
      const h = stage.clientHeight || 1;
      const narrow = w < 860;

      /* Portrait sizes the mark to the measure so both numerals stay whole —
         a half-cropped second digit stops reading as 1:1. Landscape has room
         to run larger. */
      S = narrow
        ? (w * 0.95) / MARK_W
        : Math.min((w / MARK_W) * 0.84, (h / MARK_H) * 0.8);

      const wm = w / S;
      const hm = h / S;
      const hair = 1 / S;
      const markX = wm * (narrow ? 0.025 : 0.05);
      const markY = (hm - MARK_H) / 2;

      const placed = markState().map((r) => ({ ...r, x: r.x + markX, y: r.y + markY }));

      states = [placed, gridState(wm, hm), frameState(wm, hm, hair)];
      reds = [
        redState(0, wm, hm, hair, markX, markY),
        redState(1, wm, hm, hair, markX, markY),
        redState(2, wm, hm, hair, markX, markY),
      ];
      seed = seedState(wm, hm);

      mods.forEach((el) => {
        el.style.width = `${S}px`;
        el.style.height = `${S}px`;
      });
      red.style.width = `${S}px`;
      red.style.height = `${S}px`;
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);

    /* --- Drivers -------------------------------------------------------- */
    const progress = { v: 0 };
    const reveal = { v: reduced ? 1 : 0 };
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    let lastState: 0 | 1 | 2 = 0;

    const st = ScrollTrigger.create({
      trigger: stage.closest('section') || stage,
      start: 'top top',
      end: 'bottom bottom',
      // No pin. The section is held by native CSS sticky; this only reports.
      onUpdate: (self) => {
        progress.v = self.progress;
      },
    });

    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / r.width - 0.5;
      pointer.y = (e.clientY - r.top) / r.height - 0.5;
    };
    if (!reduced && !coarse) {
      window.addEventListener('pointermove', onMove, { passive: true });
    }

    /* --- One writer ------------------------------------------------------ */
    const write = (el: HTMLElement, r: Rect, ox: number, oy: number) => {
      el.style.transform = `translate3d(${(r.x * S + ox).toFixed(2)}px, ${(
        r.y * S +
        oy
      ).toFixed(2)}px, 0) scale(${Math.max(r.sx, 0.0001).toFixed(5)}, ${Math.max(
        r.sy,
        0.0001
      ).toFixed(5)})`;
    };

    const tick = () => {
      if (!states.length) return;

      // Cursor drifts in with inertia rather than tracking exactly.
      pointer.sx += (pointer.x - pointer.sx) * 0.055;
      pointer.sy += (pointer.y - pointer.sy) * 0.055;

      const p = progress.v;
      const rv = reveal.v;

      // Which pair of states we are between, and how far.
      let base = 0;
      let t = 0;
      if (p >= SEG[1].from) {
        base = 1;
        t = clamp01((p - SEG[1].from) / (SEG[1].to - SEG[1].from));
      } else if (p >= SEG[0].from) {
        base = 0;
        t = clamp01((p - SEG[0].from) / (SEG[0].to - SEG[0].from));
      }

      const settled: 0 | 1 | 2 = (t > 0.5 ? base + 1 : base) as 0 | 1 | 2;
      if (settled !== lastState) {
        lastState = settled;
        stateCb.current?.(settled);
      }

      for (let i = 0; i < MODULES; i++) {
        const a = states[base][i];
        const b = states[base + 1] ? states[base + 1][i] : a;

        // Per-module phase: the change sweeps across the system.
        const mt = easeInOut(clamp01((t - i * STEP) / SPAN));
        let r = lerpRect(a, b, mt);

        // The entrance grows every module out of the loading crosshair.
        if (rv < 1) {
          const et = easeInOut(clamp01((rv - i * 0.045) / 0.55));
          r = lerpRect(seed[i], r, et);
        }

        const depth = 0.45 + ((i * 7) % 5) * 0.14;
        write(mods[i], r, pointer.sx * 26 * depth, pointer.sy * 18 * depth);
      }

      const ra = reds[base];
      const rb = reds[base + 1] || ra;
      let rr = lerpRect(ra, rb, easeInOut(t));
      if (rv < 1) rr = lerpRect(seed[0], rr, easeInOut(clamp01((rv - 0.5) / 0.5)));
      // The one element that follows the cursor further than the rest.
      write(red, rr, pointer.sx * 52, pointer.sy * 34);
    };

    gsap.ticker.add(tick);
    tick();

    startRef.current = () => {
      if (reduced) return;
      gsap.to(reveal, { v: 1, duration: 2.4, ease: 'power2.out' });
    };

    return () => {
      gsap.ticker.remove(tick);
      gsap.killTweensOf(reveal);
      st.kill();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      startRef.current = null;
    };
  }, [reduced, coarse]);

  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    const attempt = () => {
      if (startRef.current) startRef.current();
      else raf = requestAnimationFrame(attempt);
    };
    attempt();
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  return (
    <div className={s.stage} ref={stageRef} aria-hidden="true">
      {Array.from({ length: MODULES }, (_, i) => (
        <div
          className={s.module}
          key={i}
          ref={(el) => {
            if (el) modsRef.current[i] = el;
          }}
        />
      ))}
      <div className={`${s.module} ${s.red}`} ref={redRef} />
    </div>
  );
}
