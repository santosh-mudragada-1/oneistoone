'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useIsCoarse, useReducedMotion } from '@/lib/hooks';
import s from './Cursor.module.css';

/**
 * Two-part cursor: a dot that tracks tightly and a ring that lags behind it.
 * Elements opt in with `data-cursor="<label>"`; `data-cursor-fill` turns the
 * ring solid red for the primary action.
 */
export default function Cursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const coarse = useIsCoarse();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (coarse) return;
    const root = rootRef.current;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!root || !dot || !ring || !label) return;

    document.documentElement.classList.add('has-custom-cursor');
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });

    const fast = reduced ? 0 : 0.12;
    const slow = reduced ? 0 : 0.55;
    const dotX = gsap.quickTo(dot, 'x', { duration: fast, ease: 'power3.out' });
    const dotY = gsap.quickTo(dot, 'y', { duration: fast, ease: 'power3.out' });
    const ringX = gsap.quickTo(ring, 'x', { duration: slow, ease: 'power3.out' });
    const ringY = gsap.quickTo(ring, 'y', { duration: slow, ease: 'power3.out' });

    let shown = false;
    const onMove = (e: PointerEvent) => {
      if (!shown) {
        shown = true;
        gsap.to(root, { opacity: 1, duration: 0.4 });
        gsap.set([dot, ring], { x: e.clientX, y: e.clientY });
      }
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    };

    let activeTarget: Element | null = null;

    const setActive = (text: string, fill: boolean) => {
      label.textContent = text;
      root.dataset.fill = String(fill);
      gsap.to(ring, { scale: 1, duration: 0.5, ease: 'power3.out' });
      gsap.to(label, { opacity: 1, duration: 0.3, delay: 0.08 });
      gsap.to(dot, { scale: 0, duration: 0.35, ease: 'power3.out' });
    };

    const setIdle = () => {
      root.dataset.fill = 'false';
      gsap.to(ring, { scale: 0, duration: 0.45, ease: 'power3.out' });
      gsap.to(label, { opacity: 0, duration: 0.2 });
      gsap.to(dot, { scale: 1, duration: 0.4, ease: 'power3.out' });
    };

    const onOver = (e: Event) => {
      const target = e.target as Element | null;
      if (!target?.closest) return;

      // Track which surface the pointer is over so the cursor can invert.
      const surfaceEl = target.closest<HTMLElement>('[data-surface]');
      root.dataset.surface = surfaceEl?.dataset.surface ?? 'ink';

      const hit = target.closest<HTMLElement>('[data-cursor]');
      if (hit === activeTarget) return;
      activeTarget = hit;

      if (hit) {
        setActive(hit.dataset.cursor || 'view', hit.dataset.cursorFill === 'true');
      } else {
        setIdle();
      }
    };

    const onLeaveWindow = () => gsap.to(root, { opacity: 0, duration: 0.3 });
    const onEnterWindow = () => shown && gsap.to(root, { opacity: 1, duration: 0.3 });

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    document.addEventListener('pointerout', onOver, { passive: true });
    document.addEventListener('mouseleave', onLeaveWindow);
    document.addEventListener('mouseenter', onEnterWindow);

    return () => {
      document.documentElement.classList.remove('has-custom-cursor');
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOver);
      document.removeEventListener('mouseleave', onLeaveWindow);
      document.removeEventListener('mouseenter', onEnterWindow);
      gsap.killTweensOf([dot, ring, label, root]);
    };
  }, [coarse, reduced]);

  if (coarse) return null;

  return (
    <div className={s.root} ref={rootRef} aria-hidden="true">
      <div className={s.dot} ref={dotRef} />
      <div className={s.ring} ref={ringRef}>
        <span className={s.label} ref={labelRef} />
      </div>
    </div>
  );
}
