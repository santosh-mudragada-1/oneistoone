'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { useGsap, useIsCoarse, useReducedMotion } from '@/lib/hooks';
import ServiceSketch from '../canvas/ServiceSketch';
import Marker from '../ui/Marker';
import s from './Services.module.css';

/* One type scale for every discipline, all set from the same left edge —
   none of them outranks another. Nothing in this list is a link: it is a list
   of what the studio does, and the preview plate is the only thing that moves
   in response to the reader. The plate's mode is the row index, so the order
   here is also the order of the artwork in `ServiceSketch`. */
const SERVICES = [
  { word: 'Brand', desc: 'Strategy · Identity · Naming · Guidelines' },
  { word: 'Digital', desc: 'Web.UX/UI · Products · Platforms · Design Systems' },
  { word: 'Product', desc: 'Industrial Design · FMCG · Packaging' },
  { word: 'Space', desc: 'Interiors · Retail · Wayfinding · Environmental Graphics' },
  {
    word: 'Marketing & Growth',
    desc: 'Go-to-market · Campaigns · Content strategy · Digital marketing · SEO · CRO',
  },
];

export default function Services() {
  const root = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const coarse = useIsCoarse();
  const reduced = useReducedMotion();

  useGsap(
    () => {
      gsap.fromTo(
        `.${s.word}`,
        { yPercent: 112 },
        {
          yPercent: 0,
          duration: reduced ? 0.001 : 1.25,
          ease: 'expo.out',
          stagger: 0.07,
          scrollTrigger: { trigger: `.${s.list}`, start: 'top 82%' },
        }
      );
    },
    root,
    [reduced]
  );

  /* The plate trails the cursor with a slower follow than the pointer itself,
     so it reads as attached rather than glued. */
  useEffect(() => {
    if (coarse || reduced) return;
    const panel = panelRef.current;
    if (!panel) return;

    gsap.set(panel, { xPercent: -50, yPercent: -50 });
    const xTo = gsap.quickTo(panel, 'x', { duration: 0.75, ease: 'power3.out' });
    const yTo = gsap.quickTo(panel, 'y', { duration: 0.75, ease: 'power3.out' });

    /* Sits below the cursor, not beside it — beside it the plate covered the
       end of the word being read. Clamped so it never leaves the viewport. */
    const onMove = (e: PointerEvent) => {
      const halfW = panel.offsetWidth / 2 + 10;
      const halfH = panel.offsetHeight / 2 + 10;
      xTo(gsap.utils.clamp(halfW, window.innerWidth - halfW, e.clientX + 70));
      yTo(gsap.utils.clamp(halfH, window.innerHeight - halfH, e.clientY + 195));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [coarse, reduced]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || coarse) return;
    const show = active !== null;
    gsap.to(panel, {
      opacity: show ? 1 : 0,
      scale: show ? 1 : 0.85,
      duration: reduced ? 0.001 : 0.55,
      ease: 'expo.out',
    });
  }, [active, coarse, reduced]);

  return (
    <section
      className={`section ${s.section}`}
      id="approach"
      data-section="approach"
      data-surface="paper"
      ref={root}
    >
      <Marker index="06" title="What We Do" meta="Different disciplines. One connected practice." />

      {/* Only worth saying where there is a pointer to hover with. */}
      {!coarse ? (
        <div className={s.head}>
          <span className={`${s.hint} mono`}>
            Hover a discipline <i>→</i>
          </span>
        </div>
      ) : null}

      <ul
        className={s.list}
        data-hot={active !== null}
        onPointerLeave={() => !coarse && setActive(null)}
      >
        {SERVICES.map((item, i) => {
          const open = active === i;
          return (
            <li
              className={s.row}
              key={item.word}
              data-active={open}
              onPointerEnter={() => !coarse && setActive(i)}
            >
              <button
                type="button"
                className={s.trigger}
                onClick={() => coarse && setActive(open ? null : i)}
                aria-expanded={coarse ? open : undefined}
              >
                <span className={s.idx}>{String(i + 1).padStart(2, '0')}</span>
                <div className={s.stack}>
                  <span className={s.wordMask}>
                    <span className={s.word}>{item.word}</span>
                  </span>
                  {!coarse ? <span className={s.desc}>{item.desc}</span> : null}
                </div>
                {coarse ? <span className={s.toggle} aria-hidden="true" /> : null}
              </button>

              {coarse ? (
                <div className={s.expand} aria-hidden={!open}>
                  <div className={s.expandInner}>
                    <p className={s.mobileDesc}>{item.desc}</p>
                    <div className={s.mobileSketch}>
                      <ServiceSketch mode={i} running={open} />
                    </div>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!coarse ? (
        <div className={s.panel} ref={panelRef} aria-hidden="true">
          <ServiceSketch mode={active ?? 0} running={active !== null} />
          <div className={s.panelCap}>
            <span>
              <b>{String((active ?? 0) + 1).padStart(2, '0')}</b> {SERVICES[active ?? 0].word}
            </span>
            <span>Live</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
