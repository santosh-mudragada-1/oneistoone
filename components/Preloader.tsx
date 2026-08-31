'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/hooks';
import { useSmoothScroll } from './SmoothScroll';
import Logo from './ui/Logo';
import s from './Preloader.module.css';

/**
 * Load sequence: registration lines draw, the mark sets into them, the counter
 * runs, then the black splits into modules and lifts to reveal the hero.
 */
export default function Preloader({ onDone }: { onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const [gone, setGone] = useState(false);
  const reduced = useReducedMotion();
  const { lock, unlock } = useSmoothScroll();

  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const unlockRef = useRef(unlock);
  unlockRef.current = unlock;

  useEffect(() => {
    if (reduced) {
      setGone(true);
      doneRef.current();
      return;
    }

    lock();
    window.scrollTo(0, 0);
    if (countRef.current) countRef.current.textContent = '000';

    const ctx = gsap.context(() => {
      const counter = { v: 0 };
      const tl = gsap.timeline({
        onComplete: () => {
          setGone(true);
          unlockRef.current();
        },
      });

      tl.to(`.${s.cross}`, { scaleX: 1, duration: 1.1, ease: 'expo.inOut' }, 0)
        .to(`.${s.crossV}`, { scaleY: 1, duration: 1.1, ease: 'expo.inOut' }, 0.06)
        .fromTo(
          `.${s.markIcon}`,
          { yPercent: 115 },
          { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09 },
          0.35
        )
        .fromTo(
          [`.${s.top} > *`, `.${s.status}`],
          { opacity: 0 },
          { opacity: 1, duration: 0.7, stagger: 0.08 },
          0.5
        )
        .to(
          counter,
          {
            v: 100,
            duration: 1.7,
            ease: 'power2.inOut',
            onUpdate: () => {
              if (countRef.current) {
                countRef.current.textContent = String(Math.round(counter.v)).padStart(3, '0');
              }
            },
          },
          0.2
        )
        .to(`.${s.ruleFill}`, { scaleX: 1, duration: 1.7, ease: 'power2.inOut' }, 0.2)

        // Hand-off: the mark leaves, the frame collapses, the modules lift.
        .to(`.${s.markIcon}`, { yPercent: -115, duration: 0.75, ease: 'expo.in', stagger: 0.05 }, 2.1)
        .to([`.${s.top}`, `.${s.bottom}`, `.${s.rule}`], { opacity: 0, duration: 0.45 }, 2.15)
        .to(`.${s.cross}`, { scaleX: 0, duration: 0.7, ease: 'expo.inOut' }, 2.3)
        .to(`.${s.crossV}`, { scaleY: 0, duration: 0.7, ease: 'expo.inOut' }, 2.3)
        .to(
          `.${s.band}`,
          {
            yPercent: -101,
            duration: 1.2,
            ease: 'expo.inOut',
            stagger: { each: 0.07, from: 'start' },
          },
          2.55
        )
        // The hero starts moving while the curtain is still travelling.
        .add(() => doneRef.current(), 2.95);
    }, rootRef);

    return () => {
      ctx.revert();
      unlockRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  if (gone) return null;

  return (
    <div className={s.root} ref={rootRef} role="status" aria-label="Loading">
      <div className={s.bands} aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span className={s.band} key={i} />
        ))}
      </div>

      <div className={s.content}>
        <div className={`${s.top} mono`}>
          <span>Creative Studio</span>
          <span>Est. 2026</span>
        </div>

        <div className={s.stage} aria-hidden="true">
          <span className={s.cross} />
          <span className={s.crossV} />
          <div className={s.mark}>
            <span className={s.glyph}>
              <Logo className={s.markIcon} />
            </span>
          </div>
        </div>

        <div className={s.bottom}>
          <span className={`${s.status} mono`}>Initialising visual system</span>
          <span className={s.count}>
            <span ref={countRef} />
            <span className={s.pct}>%</span>
          </span>
        </div>

        <div className={s.rule} aria-hidden="true">
          <div className={s.ruleFill} />
        </div>
      </div>
    </div>
  );
}
