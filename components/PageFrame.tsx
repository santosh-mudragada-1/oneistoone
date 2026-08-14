'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import s from './PageFrame.module.css';

/**
 * Fixed chrome that frames the page like a print production sheet:
 * registration crosses, a progress rule and the scroll position on the right
 * edge. Deliberately holds the bottom corners clear — sections anchor their
 * own metadata there.
 */
export default function PageFrame() {
  const barRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    const pct = pctRef.current;
    if (!bar || !pct) return;

    // Seeded here, not in JSX — this node's text is written on every scroll
    // tick and React must not try to reconcile it.
    pct.textContent = '000';

    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        gsap.set(bar, { scaleX: self.progress });
        pct.textContent = String(Math.round(self.progress * 100)).padStart(3, '0');
      },
    });

    return () => st.kill();
  }, []);

  return (
    <>
      <div className={s.progress} ref={barRef} aria-hidden="true" />

      <div className={s.frame} aria-hidden="true">
        <span className={`${s.mark} ${s.tl}`} />
        <span className={`${s.mark} ${s.tr}`} />
        <span className={`${s.mark} ${s.bl}`} />
        <span className={`${s.mark} ${s.br}`} />
      </div>

      <div className={`${s.readout} ${s.scrollPct}`} aria-hidden="true">
        <span ref={pctRef} />
      </div>
    </>
  );
}
