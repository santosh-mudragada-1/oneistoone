'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { useGsap, useReducedMotion } from '@/lib/hooks';
import { useSmoothScroll } from '../SmoothScroll';
import s from './Footer.module.css';

const MENU = [
  ['Studio', 'studio'],
  ['Approach', 'approach'],
  ['Playground', 'playground'],
  ['Contact', 'contact'],
] as const;

export default function Footer() {
  const root = useRef<HTMLElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const { scrollTo } = useSmoothScroll();
  const [clock, setClock] = useState('--:--:--');
  const [dims, setDims] = useState('—');

  /* Live measurements, rendered client-side so the markup stays static. */
  useEffect(() => {
    const p = (n: number) => String(n).padStart(2, '0');
    const tick = () => {
      const d = new Date();
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    };
    const measure = () => setDims(`${window.innerWidth}×${window.innerHeight}`);
    tick();
    measure();
    const id = window.setInterval(tick, 1000);
    window.addEventListener('resize', measure);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', measure);
    };
  }, []);

  useGsap(
    () => {
      if (reduced) return;

      gsap.fromTo(
        markRef.current,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.5,
          ease: 'expo.out',
          scrollTrigger: { trigger: `.${s.markWrap}`, start: 'top 95%' },
        }
      );

      // Transform-only parallax — no layout cost on a glyph this large.
      gsap.fromTo(
        markRef.current,
        { yPercent: 12 },
        {
          yPercent: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top bottom',
            end: 'bottom bottom',
            scrub: 0.6,
          },
        }
      );
    },
    root,
    [reduced]
  );

  return (
    <footer
      className={`section ${s.footer}`}
      id="footer"
      data-section="footer"
      data-surface="ink"
      ref={root}
    >
      <div className={`grid ${s.cols} mono`}>
        <div className={s.colA}>
          <span className={s.colHead}>Menu</span>
          <nav className={s.list} aria-label="Footer">
            {MENU.map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo(`#${id}`);
                }}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div className={s.colB}>
          <span className={s.colHead}>Social</span>
          <div className={s.list}>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          </div>
        </div>

        <div className={s.colC}>
          <span className={s.colHead}>Contact</span>
          <div className={s.list}>
            <a href="mailto:hello@1-1.studio">hello@1-1.studio</a>
          </div>
        </div>

        <div className={s.colD}>
          <span className={s.colHead}>Colophon</span>
          <div className={s.note}>
            <span>Every graphic on this site is drawn in code.</span>
            <span>
              <span className={s.kbd}>G</span>toggles the layout grid.
            </span>
          </div>
        </div>
      </div>

      <div className={`${s.legal} mono mono--micro`}>
        <span>© 2026 1:1</span>
        <span>Creative Studio</span>
        <span>
          Scale 1:1 <i className={s.sep}>—</i> {dims} <i className={s.sep}>—</i> {clock}
        </span>
      </div>

      <a
        className={s.markWrap}
        href="#hero"
        onClick={(e) => {
          e.preventDefault();
          scrollTo('#hero');
        }}
        aria-label="1:1 — back to top"
        data-cursor="Top"
      >
        <span className={s.mark} ref={markRef} aria-hidden="true">
          <i>1</i>
          <i className={s.markColon}>:</i>
          <i>1</i>
        </span>
      </a>
    </footer>
  );
}
