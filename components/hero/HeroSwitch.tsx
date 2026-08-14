'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/hooks';
import s from './HeroSwitch.module.css';

export type HeroVersion = 'aperture' | 'statement';

const NAME: Record<HeroVersion, string> = {
  aperture: 'Aperture',
  statement: 'Statement',
};

export default function HeroSwitch({
  value,
  onChange,
}: {
  value: HeroVersion;
  onChange: (v: HeroVersion) => void;
}) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const first = useRef(true);

  /* The label rolls over rather than swapping, so the control reads as one
     object changing state. */
  useEffect(() => {
    const el = labelRef.current;
    if (!el) return;
    if (first.current || reduced) {
      first.current = false;
      el.textContent = NAME[value];
      return;
    }
    gsap
      .timeline()
      .to(el, { yPercent: -110, duration: 0.28, ease: 'power2.in' })
      .add(() => {
        el.textContent = NAME[value];
      })
      .fromTo(el, { yPercent: 110 }, { yPercent: 0, duration: 0.55, ease: 'expo.out' });
  }, [value, reduced]);

  const other: HeroVersion = value === 'aperture' ? 'statement' : 'aperture';

  return (
    <button
      className={s.fab}
      onClick={() => onChange(other)}
      aria-label={`Hero version: ${NAME[value]}. Switch to ${NAME[other]}.`}
      data-cursor="Switch"
    >
      <span className={s.dots} aria-hidden="true">
        <i data-on={value === 'aperture'} />
        <i data-on={value === 'statement'} />
      </span>
      <span className={s.label} aria-hidden="true">
        <span ref={labelRef} />
      </span>
      <span className={s.swap} aria-hidden="true">
        ⇄
      </span>
    </button>
  );
}
