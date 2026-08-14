'use client';

import { useCallback, useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useGsap, useIsCoarse, useReducedMotion } from '@/lib/hooks';
import HeroSystem from '../hero/HeroSystem';
import s from './Hero.module.css';

const FORMS = ['Mark', 'Grid', 'Frame'] as const;

export default function Hero({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);
  const formIdx = useRef<HTMLElement>(null);
  const formName = useRef<HTMLElement>(null);
  const xRef = useRef<HTMLElement>(null);
  const yRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const coarse = useIsCoarse();

  /* The readout names whatever form the system is currently holding. */
  const onState = useCallback(
    (i: 0 | 1 | 2) => {
      if (formIdx.current) formIdx.current.textContent = String(i + 1).padStart(2, '0');
      const el = formName.current;
      if (!el) return;
      if (reduced) {
        el.textContent = FORMS[i];
        return;
      }
      gsap.to(el, {
        duration: 0.7,
        scrambleText: { text: FORMS[i], chars: '01:—/', speed: 0.6, tweenLength: false },
      });
    },
    [reduced]
  );

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
      if (formName.current && !formName.current.textContent) {
        formName.current.textContent = FORMS[0];
      }

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        /* Typography track. Scrubbed against the same range the module system
           reads, so type and geometry move as one event. Timeline length is 1,
           so positions map directly onto scroll progress. */
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.55,
          },
        });

        tl.to({}, { duration: 1 }, 0)
          // The label's two words draw apart as the mark opens into the grid.
          .fromTo(
            `.${s.labelWord}:first-child`,
            { xPercent: 0 },
            { xPercent: -46, ease: 'none', duration: 0.3 },
            0.1
          )
          .fromTo(
            `.${s.labelWord}:last-child`,
            { xPercent: 0 },
            { xPercent: 62, ease: 'none', duration: 0.3 },
            0.1
          )
          // The label holds through the grid state — its words end up sitting
          // on column positions — and only leaves as the frame builds.
          .to(`.${s.label}`, { opacity: 0, duration: 0.1, ease: 'power2.in' }, 0.58)
          .to(`.${s.scrollCue}`, { opacity: 0, duration: 0.1, ease: 'none' }, 0.14)

          // The statement settles inside the frame the modules build.
          .fromTo(
            `.${s.statement}`,
            { opacity: 0 },
            { opacity: 1, duration: 0.08, ease: 'none' },
            0.68
          )
          .fromTo(
            `.${s.line}`,
            { yPercent: 60, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.18, stagger: 0.03, ease: 'power3.out' },
            0.68
          );

        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });

      if (!ready) return () => mm.revert();

      /* Entrance. Picks up as the loading curtain lifts: the frame's own
         chrome arrives first, then the system grows out of the crosshair. */
      const d = reduced ? 0.001 : 1;
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .fromTo(
          `.${s.top} > *`,
          { opacity: 0, y: -12 },
          { opacity: 1, y: 0, duration: d * 1.1, stagger: 0.09 },
          0
        )
        .fromTo(`.${s.barRule}`, { scaleX: 0 }, { scaleX: 1, duration: d * 1.6 }, 0.15)
        .fromTo(
          `.${s.labelWord}`,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: d * 1.3, stagger: 0.1 },
          1.15
        )
        .fromTo(
          [`.${s.form}`, `.${s.coord}`, `.${s.scrollCue}`],
          { opacity: 0 },
          { opacity: 1, duration: d * 1.1, stagger: 0.08 },
          1.35
        );

      return () => mm.revert();
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
      <div className={s.sticky}>
        <HeroSystem ready={ready} onState={onState} />

        <h1 className="sr-only">1:1 — Creative Studio. Design without defaults.</h1>

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

        <div className={s.type} aria-hidden="true">
          <div className={s.label}>
            <span className={s.labelWord}>Creative</span>
            <span className={s.labelWord}>Studio</span>
          </div>

          <div className={s.statement}>
            <span className={`${s.line}`}>Design</span>
            <span className={`${s.line} ${s.lineB}`}>Without</span>
            <span className={`${s.line}`}>
              Defaults<i className={s.stop}>.</i>
            </span>
          </div>
        </div>

        <div className={`${s.scrollCue} mono`}>
          <span>Scroll</span>
          <i className={s.scrollLine} />
        </div>

        <div className={`${s.bar} mono`}>
          <span className={s.barRule} aria-hidden="true" />
          <span className={s.form} aria-hidden="true">
            <span className="faint">Form</span>
            <b ref={formIdx}>01</b>
            <span className="op">:</span>
            <span className={s.formName} ref={formName} />
          </span>
          <span className={s.coord} aria-hidden="true">
            <span>
              X <b ref={xRef}>0.000</b>
            </span>
            <span>
              Y <b ref={yRef}>0.000</b>
            </span>
            <span className="faint">12 modules · one system</span>
          </span>
        </div>
      </div>
    </section>
  );
}
