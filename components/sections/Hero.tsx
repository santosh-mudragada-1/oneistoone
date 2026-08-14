'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useGsap, useIsCoarse, useReducedMotion } from '@/lib/hooks';
import HeroField from '../webgl/HeroField';
import s from './Hero.module.css';

export default function Hero({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);
  const xRef = useRef<HTMLElement>(null);
  const yRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const coarse = useIsCoarse();

  /* Live coordinate readout — the page reporting its own measurements. */
  useEffect(() => {
    if (coarse) return;
    const fmt = (n: number) => n.toFixed(3);
    const onMove = (e: PointerEvent) => {
      if (xRef.current) xRef.current.textContent = fmt(e.clientX / window.innerWidth);
      if (yRef.current) yRef.current.textContent = fmt(e.clientY / window.innerHeight);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [coarse]);

  useGsap(
    () => {
      if (!ready) return;
      const d = reduced ? 0.001 : 1;

      /* One sequence, picking up where the loading curtain leaves off: the
         frame draws, the mark sets into it, then the field comes alive. */
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

      tl.fromTo(`.${s.top} > *`, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: d * 1.1, stagger: 0.08 }, 0)
        .fromTo(`.${s.ruleTop}`, { scaleX: 0 }, { scaleX: 1, duration: d * 1.5 }, 0.1)
        .fromTo(`.${s.gridV}`, { scaleY: 0 }, { scaleY: 1, duration: d * 1.8 }, 0.2)
        .fromTo(
          `.${s.glyph} > span`,
          { yPercent: 108 },
          { yPercent: 0, duration: d * 1.7, stagger: 0.11 },
          0.3
        )
        .fromTo(
          `.${s.subInner}`,
          { yPercent: 110 },
          { yPercent: 0, duration: d * 1.4 },
          0.72
        )
        .fromTo(
          `.${s.marker}`,
          { scale: 0, rotate: -45 },
          { scale: 1, rotate: 0, duration: d * 1.2 },
          1.05
        )
        .fromTo(`.${s.markerLabel}`, { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: d }, 1.3)
        .fromTo(`.${s.barRule}`, { scaleX: 0 }, { scaleX: 1, duration: d * 1.4 }, 0.9)
        .fromTo(
          [`.${s.claim}`, `.${s.coord}`, `.${s.scrollCue}`],
          { opacity: 0 },
          { opacity: 1, duration: d * 1.1, stagger: 0.08 },
          1.05
        );

      if (reduced) return;

      // The lockup leaves a little faster than the frame, so the composition
      // shears apart rather than sliding away as one block.
      gsap.to(`.${s.lockup}`, {
        yPercent: -18,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.6 },
      });

      gsap.to([`.${s.bar}`, `.${s.top}`, `.${s.scrollCue}`, `.${s.marker}`, `.${s.markerLabel}`], {
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: '45% top', scrub: 0.4 },
      });
    },
    root,
    [ready, reduced]
  );

  return (
    <section
      className={`section ${s.hero}`}
      id="hero"
      data-section="hero"
      data-surface="ink"
      ref={root}
    >
      <div className={s.field}>
        <HeroField ready={ready} />
      </div>
      <div className={s.scrim} aria-hidden="true" />
      <span className={`${s.gridLine} ${s.gridV}`} aria-hidden="true" />
      <span className={s.marker} aria-hidden="true" />
      <span className={`${s.markerLabel} mono mono--micro`} aria-hidden="true">
        <b>+</b> Reg. 066 : 030
      </span>

      <div className={`${s.top} mono`}>
        <div className={s.metaCol}>
          <span>
            <span className={s.metaIdx}>01</span> — Creative Studio
          </span>
          <span className="faint">Independent · Multidisciplinary</span>
        </div>
        <div className={`${s.metaCol} ${s.metaRight}`}>
          <span>Est. 2026</span>
          <span className={s.avail}>
            Open for commissions
            <i className={s.availDot} />
          </span>
        </div>
      </div>

      <div className={s.ruleTop} aria-hidden="true">
        <span className={s.ticks} />
      </div>

      <div className={s.lockup}>
        <h1 className={s.mark}>
          <span className="sr-only">1:1 — Creative Studio</span>
          <span className={s.glyph} aria-hidden="true">
            <span>1</span>
          </span>
          <span className={s.glyph} aria-hidden="true">
            <span>:</span>
          </span>
          <span className={s.glyph} aria-hidden="true">
            <span>1</span>
          </span>
        </h1>

        <div className={s.sub} aria-hidden="true">
          <span className={s.subInner}>
            <span>Creative</span>
            <span className={s.subOutline}>Studio</span>
          </span>
        </div>
      </div>

      <div className={`${s.scrollCue} mono`}>
        <span>Scroll</span>
        <i className={s.scrollLine} />
      </div>

      <div className={`${s.bar} mono`}>
        <span className={s.barRule} aria-hidden="true" />
        <p className={s.claim}>Design without defaults.</p>
        <span className={s.coord} aria-hidden="true">
          <span>
            X <b ref={xRef}>0.000</b>
          </span>
          <span>
            Y <b ref={yRef}>0.000</b>
          </span>
          <span className="faint">Survey 01 — Field</span>
        </span>
      </div>
    </section>
  );
}
