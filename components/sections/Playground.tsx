'use client';

import { useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { useGsap, useIsCoarse } from '@/lib/hooks';
import ExperimentCanvas from '../canvas/ExperimentCanvas';
import Marker from '../ui/Marker';
import s from './Playground.module.css';

/* `col`/`row` place each card on the 12-column grid; `push` offsets it within
   its row so the pair never shares a baseline. `drift` is the transform-only
   parallax — the last trace of the old horizontal track. */
const EXPERIMENTS = [
  {
    code: 'E01',
    title: 'ASCII Solid',
    tag: 'Depth buffer · character ramp',
    ar: 1,
    col: '1 / span 5',
    colSm: '1 / span 5',
    row: 1,
    push: '0',
    drift: -26,
    action: 'move' as const,
    hint: 'Move to steer',
  },
  {
    code: 'E02',
    title: 'Halftone Field',
    tag: 'Metaballs · rotated screen',
    ar: 4 / 3,
    col: '7 / span 6',
    colSm: '2 / span 5',
    row: 1,
    push: 'clamp(3rem, 12vh, 9rem)',
    drift: 22,
    action: 'click' as const,
    hint: 'Click to turn the screen',
  },
  {
    code: 'E03',
    title: 'Pixel Displace',
    tag: 'Layered noise · shear',
    ar: 3 / 4,
    col: '2 / span 4',
    colSm: '1 / span 4',
    row: 2,
    push: '0',
    drift: -18,
    action: 'click' as const,
    hint: 'Click to flip the axis',
  },
  {
    code: 'E04',
    title: 'Type Modules',
    tag: 'Glyph sampling · repulsion',
    ar: 1,
    col: '8 / span 5',
    colSm: '3 / span 4',
    row: 2,
    push: 'clamp(2rem, 9vh, 7rem)',
    drift: 24,
    action: 'click' as const,
    hint: 'Click to change the word',
  },
  {
    code: 'E05',
    title: 'Flow Field',
    tag: 'Advection · trails',
    ar: 16 / 9,
    col: '1 / span 7',
    colSm: '1 / -1',
    row: 3,
    push: '0',
    drift: -20,
    action: 'move' as const,
    hint: 'Move to bend the field',
  },
  {
    code: 'E06',
    title: 'Modular Poster',
    tag: 'Seeded Swiss composition',
    ar: 3 / 4,
    col: '9 / span 4',
    colSm: '3 / span 4',
    row: 3,
    push: 'clamp(4rem, 14vh, 10rem)',
    drift: 18,
    action: 'click' as const,
    hint: 'Click to print another',
  },
];

export default function Playground() {
  const root = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [seeds, setSeeds] = useState<number[]>(() => EXPERIMENTS.map((_, i) => i + 1));
  const coarse = useIsCoarse();

  const bump = (i: number) => setSeeds((prev) => prev.map((v, k) => (k === i ? v + 1 : v)));

  useGsap(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tiles = gsap.utils.toArray<HTMLElement>(`.${s.tile}`);

        tiles.forEach((tile) => {
          gsap.fromTo(
            tile,
            { opacity: 0, y: 42 },
            {
              opacity: 1,
              y: 0,
              duration: 1.2,
              ease: 'expo.out',
              scrollTrigger: { trigger: tile, start: 'top 88%' },
            }
          );

          /* Transform-only drift. No pin, no scroll container, nothing that
             can take the wheel — the page keeps scrolling underneath. */
          const drift = Number(tile.dataset.drift || 0);
          gsap.fromTo(
            tile,
            { x: -drift },
            {
              x: drift,
              ease: 'none',
              scrollTrigger: {
                trigger: tile,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.8,
              },
            }
          );
        });

        // Reads how far through the lab the reader is.
        gsap.to(fillRef.current, {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: gridRef.current,
            start: 'top 75%',
            end: 'bottom bottom',
            scrub: 0.5,
          },
        });
      });

      return () => mm.revert();
    },
    root,
    []
  );

  return (
    <section
      className={`section ${s.section}`}
      id="playground"
      data-section="playground"
      data-surface="ink"
      ref={root}
    >
      <Marker index="05" title="Playground" meta="Live — running in your browser" />

      <div className={s.intro}>
        <p className={s.introWord} aria-hidden="true">
          Play
          <em>Ground</em>
        </p>
        <p className={`${s.introNote} mono`}>
          No client. No brief. Just the next idea — every piece here is drawn in code, in real
          time.
        </p>
      </div>

      <div className={s.grid} ref={gridRef}>
        {EXPERIMENTS.map((exp, i) => {
          const clickable = exp.action === 'click';
          return (
            <button
              key={exp.code}
              type="button"
              className={s.tile}
              data-drift={exp.drift}
              style={
                {
                  '--ar': exp.ar,
                  '--col': exp.col,
                  '--col-sm': exp.colSm,
                  '--row': exp.row,
                  '--push': exp.push,
                } as React.CSSProperties
              }
              onPointerEnter={() => !coarse && setActive(i)}
              onPointerLeave={() => !coarse && setActive((v) => (v === i ? null : v))}
              onFocus={() => setActive(i)}
              onBlur={() => setActive((v) => (v === i ? null : v))}
              onClick={() => clickable && bump(i)}
              data-cursor={clickable ? 'Regenerate' : 'Steer'}
              aria-label={`${exp.title} — ${exp.tag}. ${exp.hint}.`}
            >
              <span className={s.canvasWrap}>
                <ExperimentCanvas index={i} seed={seeds[i]} active={active === i || coarse} />
              </span>

              <span className={`${s.tileTop} mono mono--micro`}>
                <span className={s.tileCode}>{exp.code}</span>
                <span className={s.tileHint}>{exp.hint}</span>
              </span>

              <span className={s.tileBottom} aria-hidden="true">
                <span>
                  <span className={s.tileTitle}>{exp.title}</span>
                  <span className={`${s.tileTag} mono mono--micro`}>{exp.tag}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={s.outro}>
        <div className={s.outroInner}>
          <span className={s.outroArrow} aria-hidden="true">
            ↓
          </span>
          <p className={s.outroWord}>
            More
            <em>Soon</em>
          </p>
        </div>
      </div>

      <div className={`${s.progress} mono mono--micro`}>
        <span>{String(EXPERIMENTS.length).padStart(2, '0')} experiments</span>
        <span className={s.progressRail}>
          <i className={s.progressFill} ref={fillRef} />
        </span>
        <span>Drawn in code</span>
      </div>
    </section>
  );
}
