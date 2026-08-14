'use client';

import { useRef, useState } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useGsap } from '@/lib/hooks';
import { createSliceRig, type SliceRig } from '../type/sliceRig';
import Marker from '../ui/Marker';
import s from './Ratio.module.css';

/** The studio's name read as an argument: each pair is one 1:1 mapping. */
const PAIRS = [
  { a: 'Idea', b: 'Form', note: 'No translation loss.' },
  { a: 'Noise', b: 'Signal', note: 'Edit until it stops.' },
  { a: 'Question', b: 'System', note: 'Answers that repeat.' },
  { a: 'Instinct', b: 'Evidence', note: 'Both, or neither.' },
];

/* Where the background geometry sits for each pair. Nothing here should be
   noticed directly — it only has to keep the field from feeling static. */
const ATMOS = [
  { num: '12%', a: '28%', b: '74%', v: '17%' },
  { num: '-2%', a: '37%', b: '63%', v: '43%' },
  { num: '9%', a: '21%', b: '81%', v: '67%' },
  { num: '-8%', a: '45%', b: '57%', v: '86%' },
];

export default function Ratio() {
  const root = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLSpanElement>(null);
  const bRef = useRef<HTMLSpanElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);
  const colonRef = useRef<HTMLSpanElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const lineA = useRef<HTMLSpanElement>(null);
  const lineB = useRef<HTMLSpanElement>(null);
  const lineV = useRef<HTMLSpanElement>(null);
  const indexRef = useRef(0);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [active, setActive] = useState(0);

  useGsap(
    () => {
      const elA = aRef.current;
      const elB = bRef.current;
      if (!elA || !elB) return;

      /* The words are written imperatively from here on, so React must not own
         this text. */
      const rigs: SliceRig[] = [
        createSliceRig(elA, { align: 'right' }),
        createSliceRig(elB, { align: 'left' }),
      ];
      const [rigA, rigB] = rigs;
      rigA.set(PAIRS[0].a);
      rigB.set(PAIRS[0].b);
      if (noteRef.current) noteRef.current.textContent = PAIRS[0].note;
      if (numRef.current) numRef.current.textContent = '01';

      /* Word A is set right on wide viewports and left in portrait; the bands
         anchor to whichever edge the type is set from. */
      const alignBands = () => {
        elA.dataset.align =
          getComputedStyle(elA.parentElement as HTMLElement).textAlign === 'right'
            ? 'right'
            : 'left';
      };
      alignBands();
      ScrollTrigger.addEventListener('refreshInit', alignBands);

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        /* A drift slow enough that it registers as atmosphere rather than
           as an animation running in the background. */
        gsap.to(numRef.current, {
          xPercent: 3,
          duration: 26,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });

        /**
         * The pair is re-cut rather than replaced. Both words break into
         * horizontal bands that shear apart, and the incoming word arrives
         * through the gaps from the other side — for a beat the two are
         * interleaved strip by strip. The colon is the pivot and never
         * leaves.
         */
        const swap = (next: number) => {
          const dir = next > indexRef.current ? 1 : -1;
          indexRef.current = next;
          setActive(next);
          const p = PAIRS[next];
          const at = ATMOS[next];

          tlRef.current?.kill();
          const tl = gsap.timeline();
          tlRef.current = tl;

          // B trails A by a beat, so the pair re-cuts in reading order.
          rigA.swap(p.a, tl, 0);
          rigB.swap(p.b, tl, 0.09);

          tl.to(colonRef.current, { scaleY: 0.62, x: 5 * dir, duration: 0.34, ease: 'power2.in' }, 0)
            .to(colonRef.current, { scaleY: 1, x: 0, duration: 0.95, ease: 'expo.out' }, 0.34)

            .to(noteRef.current, { opacity: 0, y: -10 * dir, duration: 0.38, ease: 'power2.in' }, 0)
            .add(() => {
              if (noteRef.current) noteRef.current.textContent = p.note;
              if (numRef.current) {
                numRef.current.textContent = String(next + 1).padStart(2, '0');
              }
            }, 0.42)
            .fromTo(
              noteRef.current,
              { opacity: 0, y: 12 * dir },
              { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' },
              0.5
            )

            /* The background settles into its new arrangement over a longer
               span than the type, so it is always still moving when the
               words have already landed. */
            .to(numRef.current, { top: at.num, duration: 2.4, ease: 'expo.out' }, 0)
            .to(lineA.current, { top: at.a, duration: 2, ease: 'expo.inOut' }, 0.1)
            .to(lineB.current, { top: at.b, duration: 2.2, ease: 'expo.inOut' }, 0.16)
            .to(lineV.current, { left: at.v, duration: 2.4, ease: 'expo.inOut' }, 0.05);
        };

        /* Reports progress only — no pin, no scrub, nothing that can hold
           the page. The sticky stage is what keeps the composition in
           view. */
        const st = ScrollTrigger.create({
          trigger: wrapRef.current,
          start: 'top top',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const next = Math.min(
              PAIRS.length - 1,
              Math.floor(self.progress * PAIRS.length * 0.999)
            );
            if (next !== indexRef.current) swap(next);
          },
        });

        return () => {
          st.kill();
          tlRef.current?.kill();
        };
      });

      return () => {
        ScrollTrigger.removeEventListener('refreshInit', alignBands);
        mm.revert();
        rigs.forEach((r) => r.destroy());
      };
    },
    root,
    []
  );

  return (
    <section
      className={`section ${s.section}`}
      id="studio"
      data-section="studio"
      data-surface="ink"
      ref={root}
    >
      <Marker index="02" title="The Studio" meta="One ratio, four readings" />

      <p className="sr-only">{PAIRS.map((p) => `${p.a} to ${p.b}. ${p.note}`).join(' ')}</p>

      <div className={s.pinWrap} ref={wrapRef} aria-hidden="true">
        <div className={s.mapping}>
          {/* Atmosphere. Kept far below the threshold where it would compete
              with the typography. */}
          <div className={s.atmos}>
            <span className={s.atmosNum} ref={numRef} />
            <span className={s.atmosLine} ref={lineA} />
            <span className={s.atmosLine} ref={lineB} />
            <span className={s.atmosLineV} ref={lineV} />
          </div>

          <div className={`${s.mapHead} mono`}>
            <span>The studio, in one ratio</span>
            <div className={s.modules}>
              {PAIRS.map((p, i) => (
                <span className={s.module} key={p.a} data-on={i === active} />
              ))}
            </div>
          </div>

          <div className={`${s.pair} ${s.pairRow}`}>
            <span className={`${s.word} ${s.wordA}`}>
              <span ref={aRef} />
            </span>
            <span className={s.colon} ref={colonRef}>
              :
            </span>
            <span className={`${s.word} ${s.wordB}`}>
              <span ref={bRef} />
            </span>
          </div>

          <div className={`${s.mapFoot} mono`}>
            <span className={s.note}>
              <span ref={noteRef} />
            </span>
            <span className={`${s.count} faint`}>
              {String(active + 1).padStart(2, '0')} / {String(PAIRS.length).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Shown by CSS only when motion is reduced. */}
      <ul className={s.staticPairs} aria-hidden="true">
        {PAIRS.map((p) => (
          <li className={s.staticPair} key={p.a}>
            <span className={s.staticColon}>:</span>
            <span>
              <span className={s.staticWords}>
                {p.a} <span className="faint">/</span> {p.b}
              </span>
              <span className={`${s.staticNote} mono`}>{p.note}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
