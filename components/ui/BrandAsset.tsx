'use client';

import { useEffect, useId, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/hooks';
import s from './BrandAsset.module.css';

/**
 * What a brand system actually turns into.
 *
 * Five deliverables — a mark, a site, an app, a pack, a piece of motion —
 * drawn in one 120 × 90 field from rectangles, circles and three polygons, so
 * that they read as one set rather than five illustrations. Each one runs its
 * own loop, and each loop is closed: the mark turns through a whole rotation,
 * the page and the carousel scroll a whole content block, the dieline marches
 * exactly one dash period, the playhead fades out at one edge as it fades in
 * at the other. Nothing snaps back where it can be seen.
 */

export type AssetKind = 'logo' | 'web' | 'app' | 'pack' | 'motion';

const DUR: Record<AssetKind, number> = { logo: 6.4, web: 7, app: 6.6, pack: 5.6, motion: 5.2 };

export default function BrandAsset({ kind, running }: { kind: AssetKind; running: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const reduced = useReducedMotion();
  const uid = useId().replace(/:/g, '');

  useEffect(() => {
    const svg = ref.current;
    if (!svg || reduced) return;
    const q = gsap.utils.selector(svg);
    const tl = gsap.timeline({ repeat: -1, paused: true });
    tlRef.current = tl;

    if (kind === 'logo') {
      // A quarter turn at a time, four of them: the mark comes back exactly.
      const step = DUR.logo / 4;
      for (let i = 1; i <= 4; i++) {
        tl.to(
          q('[data-blade]'),
          { rotation: i * 90, svgOrigin: '60 45', duration: 0.5, ease: 'power3.inOut' },
          i * step - 0.5
        ).to(
          q('[data-pip]'),
          { x: i % 2 ? 26 : 0, y: i > 1 && i < 4 ? 26 : 0, duration: 0.5, ease: 'power3.inOut' },
          i * step - 0.5
        );
      }
      tl.set(q('[data-blade]'), { rotation: 0 }).set(q('[data-pip]'), { x: 0, y: 0 });
    }

    if (kind === 'web') {
      // The page scrolls exactly one content block; the block is set twice.
      tl.fromTo(
        q('[data-reel]'),
        { y: 0 },
        { y: -58, duration: DUR.web, ease: 'none' }
      );
    }

    if (kind === 'app') {
      // Four screens, the fourth identical to the first, so the reset is
      // exactly the frame that was already showing.
      const hold = DUR.app / 3;
      for (let i = 1; i <= 3; i++) {
        tl.to(
          q('[data-reel]'),
          { x: -26 * i, duration: 0.55, ease: 'power3.inOut' },
          i * hold - 0.55
        ).to(
          q('[data-tab]'),
          { x: (i % 3) * 9, duration: 0.55, ease: 'power3.inOut' },
          i * hold - 0.55
        );
      }
      tl.set(q('[data-reel]'), { x: 0 }).set(q('[data-tab]'), { x: 0 });
    }

    if (kind === 'pack') {
      // The label runs the height of the face; two of them, one block apart.
      tl.fromTo(
        q('[data-label]'),
        { y: 0 },
        { y: -30, duration: DUR.pack, ease: 'none' },
        0
      ).fromTo(
        q('[data-die]'),
        { strokeDashoffset: 0 },
        { strokeDashoffset: -28, duration: DUR.pack, ease: 'none' },
        0
      );
    }

    if (kind === 'motion') {
      tl.fromTo(
        q('[data-head]'),
        { x: 0 },
        { x: 92, duration: DUR.motion, ease: 'none' },
        0
      )
        // Out at one edge as it comes in at the other: no jump to see.
        .fromTo(
          q('[data-head]'),
          { opacity: 0 },
          { opacity: 1, duration: DUR.motion * 0.12, ease: 'none' },
          0
        )
        .to(q('[data-head]'), { opacity: 0, duration: DUR.motion * 0.12, ease: 'none' }, DUR.motion * 0.88)
        .fromTo(
          q('[data-cell]'),
          { x: 0, rotation: 0 },
          { x: 68, rotation: 360, svgOrigin: '29 35', duration: DUR.motion, ease: 'none' },
          0
        );
    }

    return () => {
      tl.kill();
      tlRef.current = null;
    };
  }, [kind, reduced]);

  useEffect(() => {
    tlRef.current?.paused(!running);
  }, [running]);

  return (
    <svg viewBox="0 0 120 90" className={s.svg} ref={ref} role="presentation">
      {kind === 'logo' ? (
        <>
          <rect className={s.line} x="40" y="25" width="40" height="40" />
          <path className={s.ink} data-blade="" d="M40 45 A20 20 0 0 1 60 25 L60 45 Z" />
          <rect className={s.red} data-pip="" x="37" y="22" width="6" height="6" />
          <line className={s.line} x1="20" y1="45" x2="34" y2="45" />
          <line className={s.line} x1="86" y1="45" x2="100" y2="45" />
        </>
      ) : null}

      {kind === 'web' ? (
        <>
          <clipPath id={`w${uid}`}>
            <rect x="8" y="22" width="104" height="58" />
          </clipPath>
          <rect className={s.line} x="8" y="10" width="104" height="70" />
          <line className={s.line} x1="8" y1="22" x2="112" y2="22" />
          <circle className={s.red} cx="15" cy="16" r="2" />
          <circle className={s.solid} cx="23" cy="16" r="2" />
          <circle className={s.solid} cx="31" cy="16" r="2" />
          <g clipPath={`url(#w${uid})`}>
            <g data-reel="">
              {[0, 58].map((o) => (
                <g key={o}>
                  <rect className={s.solid} x="14" y={26 + o} width="92" height="16" />
                  <rect className={s.ink} x="14" y={46 + o} width="64" height="3" />
                  <rect className={s.ink} x="14" y={52 + o} width="78" height="3" />
                  <rect className={s.line} x="14" y={60 + o} width="28" height="16" />
                  <rect className={s.line} x="46" y={60 + o} width="28" height="16" />
                  <rect className={s.line} x="78" y={60 + o} width="28" height="16" />
                </g>
              ))}
            </g>
          </g>
        </>
      ) : null}

      {kind === 'app' ? (
        <>
          <clipPath id={`a${uid}`}>
            <rect x="47" y="14" width="26" height="56" />
          </clipPath>
          <rect className={s.line} x="44" y="4" width="32" height="82" />
          <rect className={s.ink} x="55" y="8" width="10" height="2" />
          <g clipPath={`url(#a${uid})`}>
            <g data-reel="">
              {[0, 1, 2, 3].map((i) => {
                const x = 47 + i * 26;
                const v = i % 3;
                return (
                  <g key={i}>
                    <rect className={s.solid} x={x + 3} y="18" width="20" height={v === 0 ? 22 : 12} />
                    <rect className={s.ink} x={x + 3} y={v === 0 ? 44 : 34} width="14" height="2.5" />
                    <rect className={s.ink} x={x + 3} y={v === 0 ? 49 : 39} width="20" height="2.5" />
                    {v === 2 ? (
                      <rect className={s.line} x={x + 3} y="46" width="20" height="16" />
                    ) : null}
                    {v === 1 ? (
                      <circle className={s.line} cx={x + 13} cy="55" r="7" />
                    ) : null}
                  </g>
                );
              })}
            </g>
          </g>
          <rect className={s.solid} x="47" y="72" width="26" height="10" />
          <g data-tab="">
            <rect className={s.red} x="50" y="76" width="6" height="2.5" />
          </g>
          <rect className={s.ink} x="59" y="76" width="6" height="2.5" opacity="0.3" />
          <rect className={s.ink} x="68" y="76" width="4" height="2.5" opacity="0.3" />
        </>
      ) : null}

      {kind === 'pack' ? (
        <>
          <clipPath id={`p${uid}`}>
            <polygon points="42,40 62,52 62,82 42,70" />
          </clipPath>
          <polygon className={s.solid} points="42,40 62,28 82,40 62,52" />
          <polygon className={s.ink} points="42,40 62,52 62,82 42,70" opacity="0.22" />
          <polygon className={s.solid} points="62,52 82,40 82,70 62,82" />
          <g clipPath={`url(#p${uid})`}>
            <g data-label="">
              {[0, 30].map((o) => (
                <polygon
                  key={o}
                  className={s.red}
                  points={`42,${52 + o} 62,${64 + o} 62,${72 + o} 42,${60 + o}`}
                />
              ))}
            </g>
          </g>
          <polygon className={s.line} points="42,40 62,28 82,40 82,70 62,82 42,70" />
          <rect className={s.dash} data-die="" x="8" y="34" width="26" height="34" />
          <line className={s.line} x1="8" y1="76" x2="34" y2="76" />
        </>
      ) : null}

      {kind === 'motion' ? (
        <>
          <rect className={s.line} x="8" y="10" width="104" height="70" />
          <line className={s.line} x1="14" y1="62" x2="106" y2="62" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
            <line
              className={s.line}
              key={i}
              x1={14 + i * 8.4}
              y1="62"
              x2={14 + i * 8.4}
              y2={i % 4 === 0 ? 56 : 59}
            />
          ))}
          {[24, 56, 92].map((x) => (
            <rect
              className={s.ink}
              key={x}
              x={x - 3}
              y="65"
              width="6"
              height="6"
              transform={`rotate(45 ${x} 68)`}
            />
          ))}
          <rect className={s.line} data-cell="" x="20" y="26" width="18" height="18" />
          <line className={s.redLine} data-head="" x1="14" y1="16" x2="14" y2="74" />
        </>
      ) : null}
    </svg>
  );
}
