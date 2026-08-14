'use client';

import { useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { useGsap, useIsCoarse } from '@/lib/hooks';
import ExperimentCanvas from '../canvas/ExperimentCanvas';
import Marker from '../ui/Marker';
import s from './Playground.module.css';

const EXPERIMENTS = [
  {
    code: 'E01',
    title: 'ASCII Solid',
    tag: 'Depth buffer · character ramp',
    ar: 1,
    action: 'move' as const,
    hint: 'Move to steer',
  },
  {
    code: 'E02',
    title: 'Halftone Field',
    tag: 'Metaballs · rotated screen',
    ar: 4 / 3,
    action: 'click' as const,
    hint: 'Click to turn the screen',
  },
  {
    code: 'E03',
    title: 'Pixel Displace',
    tag: 'Layered noise · shear',
    ar: 3 / 4,
    action: 'click' as const,
    hint: 'Click to flip the axis',
  },
  {
    code: 'E04',
    title: 'Type Modules',
    tag: 'Glyph sampling · repulsion',
    ar: 1,
    action: 'click' as const,
    hint: 'Click to change the word',
  },
  {
    code: 'E05',
    title: 'Flow Field',
    tag: 'Advection · trails',
    ar: 16 / 9,
    action: 'move' as const,
    hint: 'Move to bend the field',
  },
  {
    code: 'E06',
    title: 'Modular Poster',
    tag: 'Seeded Swiss composition',
    ar: 3 / 4,
    action: 'click' as const,
    hint: 'Click to print another',
  },
];

export default function Playground() {
  const root = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [seeds, setSeeds] = useState<number[]>(() => EXPERIMENTS.map((_, i) => i + 1));
  const coarse = useIsCoarse();

  const bump = (i: number) =>
    setSeeds((prev) => prev.map((v, k) => (k === i ? v + 1 : v)));

  useGsap(
    () => {
      const mm = gsap.matchMedia();

      /* Desktop: the lab is pinned and travels sideways with the scroll. */
      mm.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
        const track = trackRef.current;
        const pin = pinRef.current;
        if (!track || !pin) return;

        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: pin,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.7,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (fillRef.current) gsap.set(fillRef.current, { scaleX: self.progress });
            },
          },
        });

        return () => {
          tween.kill();
        };
      });

      mm.add(
        {
          motion: '(prefers-reduced-motion: no-preference)',
          still: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const motion = Boolean(ctx.conditions?.motion);
          gsap.fromTo(
            `.${s.tile}, .${s.panel}`,
            { opacity: 0, y: motion ? 34 : 0 },
            {
              opacity: 1,
              y: 0,
              duration: motion ? 1.1 : 0.001,
              ease: 'expo.out',
              stagger: motion ? 0.06 : 0,
              scrollTrigger: { trigger: pinRef.current, start: 'top 85%' },
            }
          );
        }
      );

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
      <div className={s.head}>
        <Marker index="05" title="Playground" meta="Live — running in your browser" />
      </div>

      <div className={s.pin} ref={pinRef}>
        <div className={s.viewport} data-lenis-prevent>
          <div className={s.track} ref={trackRef}>
            <div className={s.panel}>
              {/* Restates the section title as a graphic; the Marker above
                  carries the actual heading. */}
              <p className={s.panelWord} aria-hidden="true">
                Play
                <em>Ground</em>
              </p>
              <p className={`${s.panelNote} mono`}>
                No client. No brief. Just the next idea — every piece here is drawn in code,
                in real time.
              </p>
            </div>

            {EXPERIMENTS.map((exp, i) => {
              const clickable = exp.action === 'click';
              return (
                <button
                  key={exp.code}
                  type="button"
                  className={s.tile}
                  style={{ '--ar': exp.ar } as React.CSSProperties}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive((v) => (v === i ? null : v))}
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

            <div className={`${s.panel} ${s.outro}`}>
              <span className={s.outroArrow} aria-hidden="true">
                →
              </span>
              <p className={s.panelWord}>
                More
                <em>Soon</em>
              </p>
            </div>
          </div>
        </div>

        <div className={`${s.progress} mono mono--micro`}>
          <span>
            {String(EXPERIMENTS.length).padStart(2, '0')} experiments
          </span>
          <span className={s.progressRail}>
            <i className={s.progressFill} ref={fillRef} />
          </span>
          <span>{coarse ? 'Swipe' : 'Scroll'}</span>
        </div>
      </div>
    </section>
  );
}
