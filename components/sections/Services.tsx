'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { useGsap, useIsCoarse, useReducedMotion } from '@/lib/hooks';
import ServiceSketch from '../canvas/ServiceSketch';
import Marker from '../ui/Marker';
import s from './Services.module.css';

/* One type scale for every discipline — none of them outranks another. The
   composition varies through `indent`, which steps the list out and back in a
   deliberate arc, and through the hover interaction. */
const SERVICES = [
  { word: 'Brand', desc: 'Identity systems, naming, art direction', indent: '0%' },
  { word: 'Product', desc: 'Interfaces, design systems, prototypes', indent: '6%' },
  { word: 'Digital', desc: 'Sites, editorial, real-time graphics', indent: '12%' },
  { word: 'Motion', desc: 'Titles, loops, interaction choreography', indent: '6%' },
  { word: 'Experimental', desc: 'Research, tools, work with no brief yet', indent: '0%' },
];

export default function Services() {
  const root = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [inline, setInline] = useState(false);
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
    const show = active !== null && !inline;
    gsap.to(panel, {
      opacity: show ? 1 : 0,
      scale: show ? 1 : 0.85,
      duration: reduced ? 0.001 : 0.55,
      ease: 'expo.out',
    });
  }, [active, inline, coarse, reduced]);

  const open = (i: number, asInline: boolean) => {
    setActive(i);
    setInline(asInline);
  };

  return (
    <section
      className={`section ${s.section}`}
      id="approach"
      data-section="approach"
      data-surface="paper"
      ref={root}
    >
      <Marker index="03" title="What We Do" meta="Five disciplines, one standard" />

      <div className={s.head}>
        <span className={`${s.hint} mono`}>
          {coarse ? 'Tap a discipline' : 'Hover a discipline'} <i>→</i>
        </span>
      </div>

      <ul
        className={s.list}
        data-hot={active !== null}
        onPointerLeave={() => !coarse && setActive(null)}
      >
        {SERVICES.map((item, i) => (
          <li className={s.row} key={item.word} data-active={active === i}>
            <button
              type="button"
              className={s.trigger}
              style={{ '--indent': item.indent } as React.CSSProperties}
              onPointerEnter={() => !coarse && open(i, false)}
              onFocus={() => open(i, true)}
              onBlur={() => setActive(null)}
              onClick={() => (active === i && inline ? setActive(null) : open(i, true))}
              aria-expanded={active === i}
              data-cursor={coarse ? undefined : 'View'}
            >
              <span className={s.idx}>{String(i + 1).padStart(2, '0')}</span>
              <span className={s.wordMask}>
                <span className={s.word}>{item.word}</span>
              </span>
              <span className={s.tail}>
                <span className={s.desc}>{item.desc}</span>
                <span className={s.plus} aria-hidden="true">
                  +
                </span>
              </span>
            </button>

            {active === i && inline ? (
              <div className={s.inline}>
                <ServiceSketch mode={i} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {!coarse ? (
        <div className={s.panel} ref={panelRef} aria-hidden="true">
          <ServiceSketch mode={active ?? 0} running={active !== null && !inline} />
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
