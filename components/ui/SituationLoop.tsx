'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/hooks';
import s from './SituationLoop.module.css';

/**
 * Three situations, drawn as solid geometry.
 *
 *   rebuild  the same six parts, arranged three ways and back again. Nothing
 *            is added and nothing is thrown away — the business already has
 *            what it needs, in the wrong order.
 *   grow     one point, opening outward for ever. Modules are born at the
 *            centre on a fixed ratio and leave at the edge, so the field is
 *            self-similar and there is no frame to catch it repeating.
 *   connect  six separate runs on six baselines, brought onto one and abutted
 *            into a single continuous rhythm, then let go again.
 *
 * All three close: the first returns to its opening arrangement, the second is
 * periodic by construction, the third runs out and back on one timeline.
 */

export type LoopKind = 'rebuild' | 'grow' | 'connect';

/* Six parts, cut to a four-column module: one cell is 14, a gutter is 2, so
   the parts are 14 / 30 / 46 / 62 across and the six of them tile a 62 square
   exactly, with the same 2 between every one of them. Sizes never change —
   only where they are and which way up. */
const PARTS = [
  { w: 30, h: 30, accent: false, ghost: false },
  { w: 30, h: 14, accent: false, ghost: false },
  { w: 14, h: 30, accent: false, ghost: true },
  { w: 14, h: 14, accent: true, ghost: false },
  { w: 46, h: 14, accent: false, ghost: false },
  { w: 14, h: 62, accent: false, ghost: true },
];

/* Three arrangements. Centres, in per cent, and a rotation.
   The first is the one they resolve to and the one the loop returns to: the
   six parts closed up into a single square on one gutter. The other two are
   the same parts, out of order. */
const FORMS: [number, number, number][][] = [
  [
    [50, 34, 0],
    [50, 74, 0],
    [74, 34, 0],
    [74, 74, 0],
    [58, 58, 0],
    [26, 50, 0],
  ],
  [
    [42, 44, 0],
    [64, 70, 0],
    [76, 36, 0],
    [30, 72, 45],
    [48, 18, 0],
    [18, 50, 0],
  ],
  [
    [36, 62, 0],
    [68, 76, 0],
    [80, 46, 0],
    [58, 44, 45],
    [52, 88, 0],
    [46, 20, 90],
  ],
];

/** Six runs: where each starts when they are separate, and how wide it is. */
const RUNS = [
  { w: 13, h: 18, x: 4, y: -16, accent: false },
  { w: 9, h: 30, x: 24, y: 9, accent: false },
  { w: 17, h: 21, x: 39, y: -7, accent: true },
  { w: 11, h: 34, x: 62, y: 14, accent: false },
  { w: 14, h: 17, x: 77, y: -12, accent: false },
  { w: 8, h: 27, x: 94, y: 5, accent: false },
];
/* Where those runs sit once they are one: on one baseline, at one height, on
   one rhythm — and still six of them, because that is the point. */
const JOINED = [8, 22, 32, 50, 62, 77];
const JOINED_H = 26;

const RINGS = 5;
const GROW_CYCLE = 11;

export default function SituationLoop({ kind, running }: { kind: LoopKind; running: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | gsap.core.Tween | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const q = gsap.utils.selector(el);

    if (kind === 'rebuild') {
      const blocks = q(`.${s.block}`);
      /* Function values are read per property, not per element object: the
         whole vars block cannot be a function. */
      gsap.set(blocks, {
        xPercent: -50,
        yPercent: -50,
        left: (i: number) => `${FORMS[0][i][0]}%`,
        top: (i: number) => `${FORMS[0][i][1]}%`,
        rotation: (i: number) => FORMS[0][i][2],
      });

      const tl = gsap.timeline({ repeat: -1, paused: true });
      for (let f = 1; f <= 3; f++) {
        // The third move returns them to the arrangement they opened in.
        const to = FORMS[f % 3];
        tl.to(
          blocks,
          {
            duration: 1,
            ease: 'power3.inOut',
            stagger: { each: 0.05, from: 'center' },
            left: (i: number) => `${to[i][0]}%`,
            top: (i: number) => `${to[i][1]}%`,
            rotation: (i: number) => to[i][2],
          },
          f * 2.4
        );
      }
      tl.to({}, { duration: 0.6 }, 3 * 2.4 + 1);
      tlRef.current = tl;
    }

    if (kind === 'grow') {
      const rings = q(`.${s.ring}`);
      /* One driver for the whole field: each ring reads the same clock a fifth
         of a cycle apart, so what leaves the edge has already been replaced at
         the centre. The ratio between neighbours is constant, which is what
         makes it self-similar and therefore endless. */
      const drive = { t: 0 };
      const tw = gsap.to(drive, {
        t: 1,
        duration: GROW_CYCLE,
        ease: 'none',
        repeat: -1,
        paused: true,
        onUpdate: () => {
          /* The whole field also turns a quarter of a revolution a cycle. The
             module is four-fold symmetric, so ninety degrees maps it onto
             itself and the turn has no end either. */
          const spin = drive.t * 90;
          rings.forEach((r, i) => {
            const u = (drive.t + i / RINGS) % 1;
            const scale = 0.1 * Math.pow(30, u);
            const fade = Math.min(1, u / 0.16) * Math.min(1, (1 - u) / 0.3);
            (r as HTMLElement).style.transform = `rotate(${spin.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
            (r as HTMLElement).style.opacity = fade.toFixed(3);
          });
        },
      });
      tlRef.current = tw;
    }

    if (kind === 'connect') {
      const bars = q(`.${s.bar}`);
      const tie = q(`.${s.tie}`)[0];
      gsap.set(bars, {
        left: (i: number) => `${RUNS[i].x}%`,
        y: (i: number) => RUNS[i].y,
        height: (i: number) => `${RUNS[i].h}%`,
      });
      gsap.set(tie, { scaleX: 0 });

      /* Out and back on one timeline: the way home is the way out, reversed,
         so the two ends of the loop are the same frame. */
      const tl = gsap.timeline({ repeat: -1, yoyo: true, repeatDelay: 0.5, paused: true });
      tl.to(bars, {
        left: (i: number) => `${JOINED[i]}%`,
        height: `${JOINED_H}%`,
        y: 0,
        duration: 1.35,
        ease: 'power3.inOut',
        stagger: { each: 0.05, from: 'edges' },
      })
        .to(tie, { scaleX: 1, duration: 0.8, ease: 'power2.out' }, 0.85)
        .to({}, { duration: 0.7 });
      tlRef.current = tl;
    }

    return () => {
      tlRef.current?.kill();
      tlRef.current = null;
    };
  }, [kind]);

  useEffect(() => {
    tlRef.current?.paused(!running || reduced);
    if (reduced) tlRef.current?.progress(kind === 'connect' ? 0.62 : 0.34);
  }, [running, reduced, kind]);

  return (
    <div className={s.box} ref={ref} aria-hidden="true">
      {kind === 'rebuild'
        ? PARTS.map((p, i) => (
            <span
              className={s.block}
              key={i}
              data-accent={p.accent || undefined}
              data-ghost={p.ghost || undefined}
              style={{ width: `${p.w}%`, height: `${p.h}%` }}
            />
          ))
        : null}

      {kind === 'grow' ? (
        <svg viewBox="0 0 100 100" className={s.svg} preserveAspectRatio="xMidYMid slice">
          {Array.from({ length: RINGS }, (_, i) => (
            <g className={s.ring} key={i} style={{ transformBox: 'view-box', transformOrigin: '50% 50%' }}>
              <rect x="30" y="30" width="40" height="40" />
              <line x1="50" y1="30" x2="50" y2="70" />
              <line x1="30" y1="50" x2="70" y2="50" />
            </g>
          ))}
          <rect className={s.origin} x="48.5" y="48.5" width="3" height="3" />
        </svg>
      ) : null}

      {kind === 'connect' ? (
        <>
          <span className={s.tie} style={{ left: '8%', width: '77%', top: '34%' }} />
          {RUNS.map((r, i) => (
            <span
              className={s.bar}
              key={i}
              data-accent={r.accent || undefined}
              style={{ width: `${r.w}%`, bottom: '38%' }}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}
