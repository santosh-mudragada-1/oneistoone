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
/* One type scale for every discipline — none of them outranks another. The
   composition varies through `indent`, which steps the list out and back in a
   deliberate arc, and through `at`: the horizontal anchor the plate settles on
   for that row, alternating down the list. */
const SERVICES = [
  { word: 'Brand', desc: 'Identity systems, naming, art direction', indent: '0%', at: 0.56 },
  { word: 'Product', desc: 'Interfaces, design systems, prototypes', indent: '6%', at: 0.72 },
  { word: 'Digital', desc: 'Sites, editorial, real-time graphics', indent: '12%', at: 0.54 },
  { word: 'Motion', desc: 'Titles, loops, interaction choreography', indent: '6%', at: 0.73 },
  { word: 'Experimental', desc: 'Research, tools, work with no brief yet', indent: '0%', at: 0.58 },
];

export default function Services() {
  const root = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<HTMLLIElement[]>([]);
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

  /* The plate settles on the hovered row rather than chasing the pointer: it
     centres on that row's baseline at the row's own horizontal anchor. Moving
     between rows makes it travel, which is what gives the list its rhythm. */
  useEffect(() => {
    const panel = panelRef.current;
    const list = listRef.current;
    if (!panel || !list || coarse) return;

    gsap.set(panel, { xPercent: -50, yPercent: -50 });
    const show = active !== null && !inline;

    if (!show) {
      gsap.to(panel, {
        opacity: 0,
        scale: 0.72,
        duration: reduced ? 0.001 : 0.5,
        ease: 'power3.out',
      });
      return;
    }

    const row = rowRefs.current[active];
    if (!row) return;
    const x = list.clientWidth * SERVICES[active].at;
    const y = row.offsetTop + row.offsetHeight / 2;
    const first = gsap.getProperty(panel, 'opacity') === 0;

    gsap.to(panel, {
      x,
      y,
      opacity: 1,
      scale: 1,
      duration: reduced ? 0.001 : first ? 0.7 : 0.9,
      ease: first ? 'expo.out' : 'power3.inOut',
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

      {/* The plate is positioned against this wrapper, so it can sit on a
          row's centre line without leaving the list's coordinate space. */}
      <div className={s.listWrap} ref={listRef}>
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

        <ul
          className={s.list}
          data-hot={active !== null}
          onPointerLeave={() => !coarse && setActive(null)}
        >
        {SERVICES.map((item, i) => (
          <li
            className={s.row}
            key={item.word}
            data-active={active === i}
            ref={(el) => {
              if (el) rowRefs.current[i] = el;
            }}
          >
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
                <span className={s.word}>
                  {item.word}
                  <i className={s.dot} aria-hidden="true" />
                </span>
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
      </div>
    </section>
  );
}
