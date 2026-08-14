'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/hooks';
import { useSmoothScroll } from './SmoothScroll';
import s from './Nav.module.css';

type NavItem = { id: string; label: string; idx: string; covers: string[] };

const ITEMS: NavItem[] = [
  { id: 'studio', label: 'Studio', idx: '02', covers: ['studio'] },
  { id: 'approach', label: 'Approach', idx: '03', covers: ['approach', 'process'] },
  { id: 'playground', label: 'Playground', idx: '05', covers: ['playground'] },
  { id: 'contact', label: 'Contact', idx: '06', covers: ['contact', 'footer'] },
];

export default function Nav() {
  const navRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState('hero');
  const [theme, setTheme] = useState<'ink' | 'paper' | 'red'>('ink');
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const { scrollTo, lock, unlock } = useSmoothScroll();

  /* Active section + surface tracking. One trigger per section, sampled at
     the nav's own baseline so the switch happens exactly as it crosses. */
  useEffect(() => {
    const sections = gsap.utils.toArray<HTMLElement>('[data-section]');

    /* At the very top of the page no trigger has fired yet, so the nav would
       keep its default ink theme — invisible over a light hero. Resolve the
       section under the nav's baseline directly, on mount and on every
       refresh. */
    const resolve = () => {
      const line = 64;
      // Queried fresh — the section list can change under us.
      const live = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));
      const hit =
        live.find((sec) => {
          const r = sec.getBoundingClientRect();
          return r.top <= line && r.bottom > line;
        }) || live[0];
      if (!hit) return;
      setActive(hit.dataset.section || 'hero');
      setTheme((hit.dataset.surface as 'ink' | 'paper' | 'red') || 'ink');
    };

    resolve();
    ScrollTrigger.addEventListener('refresh', resolve);

    const triggers = sections.map((sec) =>
      ScrollTrigger.create({
        trigger: sec,
        start: 'top top+=64',
        end: 'bottom top+=64',
        onToggle: (self) => {
          if (!self.isActive) return;
          setActive(sec.dataset.section || 'hero');
          setTheme((sec.dataset.surface as 'ink' | 'paper' | 'red') || 'ink');
        },
      })
    );

    /* Compact — which is also what gives the bar its solid background — is
       simply "the page is scrolled". A ScrollTrigger ending at `max` released
       it at the very bottom of the document, so the nav turned transparent
       again over the footer and the type behind it showed through. */
    const onScroll = () => setCompact(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      ScrollTrigger.removeEventListener('refresh', resolve);
      window.removeEventListener('scroll', onScroll);
      triggers.forEach((t) => t.kill());
    };
  }, []);

  /* Overlay open / close. */
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;

    const words = el.querySelectorAll(`.${s.bigWord}`);
    const foot = el.querySelectorAll(`.${s.overlayFoot} > *`);
    const dur = reduced ? 0.001 : 1;
    gsap.killTweensOf([el, words, foot]);

    if (open) {
      lock();
      gsap.set(el, { visibility: 'visible' });
      gsap
        .timeline()
        .to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: dur, ease: 'expo.inOut' })
        .fromTo(
          words,
          { yPercent: 118 },
          { yPercent: 0, duration: dur * 1.1, ease: 'expo.out', stagger: 0.06 },
          dur * 0.35
        )
        .fromTo(foot, { opacity: 0 }, { opacity: 1, duration: dur * 0.6, stagger: 0.06 }, dur * 0.6);
    } else {
      gsap
        .timeline({ onComplete: () => gsap.set(el, { visibility: 'hidden' }) })
        .to(words, { yPercent: -118, duration: dur * 0.55, ease: 'expo.in', stagger: 0.035 }, 0)
        .to(foot, { opacity: 0, duration: dur * 0.3 }, 0)
        .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: dur * 0.9, ease: 'expo.inOut' }, dur * 0.3);
      unlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      setOpen(false);
      // Wait for the overlay wipe to clear before the scroll starts.
      window.setTimeout(() => scrollTo(`#${id}`, id === 'hero' ? 0 : -1), open ? 620 : 0);
    },
    [scrollTo, open]
  );

  const activeItem = ITEMS.find((i) => i.covers.includes(active));

  return (
    <>
      <header
        className={s.nav}
        ref={navRef}
        data-theme={open ? 'ink' : theme}
        data-compact={compact}
        data-menu={open}
      >
        <a
          href="#hero"
          className={s.mark}
          onClick={(e) => go(e, 'hero')}
          data-cursor="Top"
          aria-label="1:1 — back to top"
        >
          1<span className={s.colon}>:</span>1
        </a>
        <span className={s.markMeta}>Creative Studio</span>

        <nav className={s.links} aria-label="Sections">
          {ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={s.link}
              data-active={activeItem?.id === item.id}
              onClick={(e) => go(e, item.id)}
            >
              <span className={s.linkIdx}>{item.idx}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <button
          className={s.menuBtn}
          data-open={open}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-overlay"
        >
          {open ? 'Close' : 'Menu'}
          <span className={s.menuGlyph} aria-hidden="true">
            +
          </span>
        </button>

        <span className={s.underline} aria-hidden="true" />
      </header>

      <div className={s.overlay} id="menu-overlay" ref={overlayRef} data-surface="ink">
        <div className={s.overlayInner}>
          {ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={s.bigLink}
              onClick={(e) => go(e, item.id)}
              tabIndex={open ? 0 : -1}
            >
              <span className={s.bigIdx}>{item.idx}</span>
              <span className="mask">
                <span className={s.bigWord}>{item.label}</span>
              </span>
              <span className={s.bigArrow} aria-hidden="true">
                ↗
              </span>
            </a>
          ))}
        </div>

        <div className={`${s.overlayFoot} mono`}>
          <a href="mailto:hello@1-1.studio" tabIndex={open ? 0 : -1}>
            hello@1-1.studio
          </a>
          <div className={s.socials}>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" tabIndex={open ? 0 : -1}>
              Instagram
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" tabIndex={open ? 0 : -1}>
              LinkedIn
            </a>
          </div>
          <span>Available for new work</span>
        </div>
      </div>
    </>
  );
}
