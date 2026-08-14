'use client';

import { useCallback, useRef, useState } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useGsap, useReducedMotion } from '@/lib/hooks';
import PointField from '../webgl/PointField';
import s from './Hero.module.css';

export default function Hero({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLSpanElement>(null);
  const [formIdx, setFormIdx] = useState(0);
  const reduced = useReducedMotion();

  /* The readout scrambles into the new form name as the cloud reassembles. */
  const onFormChange = useCallback(
    (name: string, index: number) => {
      setFormIdx(index);
      const el = formRef.current;
      if (!el) return;
      if (reduced) {
        el.textContent = name;
        return;
      }
      gsap.to(el, {
        duration: 0.9,
        scrambleText: { text: name, chars: '01:/—', speed: 0.5, tweenLength: false },
      });
    },
    [reduced]
  );

  useGsap(
    () => {
      if (formRef.current && !formRef.current.textContent) {
        formRef.current.textContent = 'Mark';
      }
      if (!ready) return;

      const dur = reduced ? 0.001 : 1;
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

      tl.fromTo(
        `.${s.meta} .${s.metaCol}`,
        { opacity: 0, y: -14 },
        { opacity: 1, y: 0, duration: dur * 1.1, stagger: 0.08 },
        0
      )
        .fromTo(
          `.${s.line} > span`,
          { yPercent: 116 },
          { yPercent: 0, duration: dur * 1.5, stagger: 0.1 },
          0.15
        )
        .fromTo(`.${s.barRule}`, { scaleX: 0 }, { scaleX: 1, duration: dur * 1.4 }, 0.5)
        .fromTo(
          [`.${s.lede}`, `.${s.form}`, `.${s.scrollCue}`],
          { opacity: 0 },
          { opacity: 1, duration: dur * 1.1, stagger: 0.09 },
          0.7
        );

      if (reduced) return;

      /* Lines leave at different speeds so the block shears apart on exit. */
      gsap.utils.toArray<HTMLElement>(`.${s.line}`).forEach((line, i) => {
        gsap.to(line, {
          yPercent: -14 - i * 16,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
          },
        });
      });

      gsap.to([`.${s.bar}`, `.${s.meta}`, `.${s.scrollCue}`], {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '40% top',
          scrub: 0.4,
        },
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
      <div className={s.canvas}>
        <PointField ready={ready} onFormChange={onFormChange} />
      </div>
      <div className={s.scrim} aria-hidden="true" />

      <div className={`${s.meta} mono`}>
        <div className={s.metaCol}>
          <span>Creative Studio</span>
          <span className="faint">Index 01 — Opening</span>
        </div>
        <div className={`${s.metaCol} ${s.metaRight}`}>
          <span>Est. 2026</span>
          <span className={s.avail}>
            Open for commissions
            <i className={s.availDot} />
          </span>
        </div>
      </div>

      <div className={`${s.scrollCue} mono`}>
        <span>Scroll</span>
        <i className={s.scrollLine} />
      </div>

      <h1 className={s.statement}>
        <span className="sr-only">Design without defaults.</span>
        <span className={`display ${s.line}`} aria-hidden="true">
          <span>Design</span>
        </span>
        <span className={`display ${s.line} ${s.lineB}`} aria-hidden="true">
          <span>Without</span>
        </span>
        <span className={`display ${s.line}`} aria-hidden="true">
          <span>
            Defaults<i className={s.stop}>.</i>
          </span>
        </span>
      </h1>

      <div className={`${s.bar} mono`}>
        <span className={s.barRule} aria-hidden="true" />
        <p className={s.lede}>
          A creative studio working at <span className="serif">actual size</span>.
        </p>
        {/* Live readout of the cloud's current form — decorative, and its
            label is written by GSAP rather than React. */}
        <span className={s.form} aria-hidden="true">
          <span className="faint">Form</span>
          <span className="red">{String(formIdx + 1).padStart(2, '0')}</span>
          <span className="op">:</span>
          <span className={s.formName} ref={formRef} />
          <i className={s.arrow}>↓</i>
        </span>
      </div>
    </section>
  );
}
