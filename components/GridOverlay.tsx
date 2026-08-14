'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import s from './GridOverlay.module.css';

/**
 * Press G to reveal the layout grid the whole page is built on. A studio
 * showing its own construction lines — and a way to prove the composition is
 * deliberate rather than arbitrary.
 */
export default function GridOverlay() {
  const [on, setOn] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'g' && e.key !== 'G') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      setOn((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const chip = chipRef.current;
    if (!root || !chip) return;

    const cols = root.querySelectorAll(`.${s.col}`);
    gsap.killTweensOf([cols, chip]);

    if (on) {
      gsap.fromTo(
        cols,
        { scaleY: 0 },
        { scaleY: 1, duration: 0.7, ease: 'expo.out', stagger: { each: 0.022, from: 'center' } }
      );
      gsap.fromTo(
        chip,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' }
      );
    } else {
      gsap.to(cols, {
        scaleY: 0,
        duration: 0.45,
        ease: 'power3.in',
        stagger: { each: 0.015, from: 'edges' },
      });
      gsap.to(chip, { opacity: 0, duration: 0.25 });
    }
  }, [on]);

  return (
    <>
      <div className={s.overlay} data-on={on} ref={rootRef} aria-hidden="true">
        <div className={s.rows} />
        <div className={s.cols}>
          {Array.from({ length: 12 }, (_, i) => (
            <span className={s.col} key={i} />
          ))}
        </div>
      </div>
      <div className={s.chip} ref={chipRef} aria-hidden="true">
        Grid 12 / on — press G
      </div>
    </>
  );
}
