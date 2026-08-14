'use client';

import { useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { useGsap } from '@/lib/hooks';
import Marker from '../ui/Marker';
import s from './PointOfView.module.css';

/** The studio's name read as an argument: each pair is one 1:1 mapping. */
const PAIRS = [
  { a: 'Idea', b: 'Form', note: 'No translation loss.' },
  { a: 'Noise', b: 'Signal', note: 'Edit until it stops.' },
  { a: 'Question', b: 'System', note: 'Answers that repeat.' },
  { a: 'Instinct', b: 'Evidence', note: 'Both, or neither.' },
];

export default function PointOfView() {
  const root = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLSpanElement>(null);
  const bRef = useRef<HTMLSpanElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);
  const colonRef = useRef<HTMLSpanElement>(null);
  const indexRef = useRef(0);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [active, setActive] = useState(0);

  useGsap(
    () => {
      /* Written imperatively below, so React must not own this text. */
      if (aRef.current) aRef.current.textContent = PAIRS[0].a;
      if (bRef.current) bRef.current.textContent = PAIRS[0].b;
      if (noteRef.current) noteRef.current.textContent = PAIRS[0].note;

      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: '(prefers-reduced-motion: no-preference)',
          still: '(prefers-reduced-motion: reduce)',
        },
        (ctx) => {
          const motion = Boolean(ctx.conditions?.motion);

          gsap.fromTo(
            `.${s.line} > span`,
            { yPercent: 118 },
            {
              yPercent: 0,
              duration: motion ? 1.4 : 0.001,
              ease: 'expo.out',
              stagger: motion ? 0.11 : 0,
              scrollTrigger: { trigger: `.${s.statement}`, start: 'top 78%' },
            }
          );

          if (!motion) return;

          /* One continuous compression and release. The width axis and
             tracking travel through the whole event, and the words are
             exchanged at the pinch — where opacity is already zero — so the
             pair reads as one object reshaping rather than two words cutting.
             The colon is the pivot and never leaves. */
          const swap = (next: number) => {
            const dir = next > indexRef.current ? 1 : -1;
            indexRef.current = next;
            setActive(next);
            const p = PAIRS[next];
            const words = [aRef.current, bRef.current];
            const axis = { wdth: 100, track: -5 };

            const apply = () => {
              words.forEach((el) => {
                if (!el) return;
                el.style.fontStretch = `${axis.wdth}%`;
                el.style.letterSpacing = `${axis.track / 100}em`;
              });
            };

            tlRef.current?.kill();
            const tl = gsap.timeline();
            tlRef.current = tl;
            const PINCH = 0.62;

            tl.to(
              axis,
              { wdth: 58, track: -9.5, duration: PINCH, ease: 'power2.inOut', onUpdate: apply },
              0
            )
              .to(words, { opacity: 0, duration: 0.5, ease: 'power2.in' }, 0.1)
              .to(noteRef.current, { opacity: 0, y: -10 * dir, duration: 0.4, ease: 'power2.in' }, 0)
              .to(colonRef.current, { scaleY: 0.4, duration: PINCH, ease: 'power2.inOut' }, 0)

              .add(() => {
                if (aRef.current) aRef.current.textContent = p.a;
                if (bRef.current) bRef.current.textContent = p.b;
                if (noteRef.current) noteRef.current.textContent = p.note;
              }, PINCH)

              .to(
                axis,
                { wdth: 100, track: -5, duration: 1.2, ease: 'expo.out', onUpdate: apply },
                PINCH
              )
              .to(words, { opacity: 1, duration: 0.8, ease: 'power2.out' }, PINCH + 0.02)
              .to(colonRef.current, { scaleY: 1, duration: 1, ease: 'expo.out' }, PINCH)
              .fromTo(
                noteRef.current,
                { opacity: 0, y: 12 * dir },
                { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' },
                PINCH + 0.08
              );
          };

          gsap.to(pinRef.current, {
            ease: 'none',
            scrollTrigger: {
              trigger: pinRef.current,
              start: 'top top',
              end: `+=${PAIRS.length * 100}%`,
              pin: true,
              pinSpacing: true,
              scrub: true,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const next = Math.min(PAIRS.length - 1, Math.floor(self.progress * PAIRS.length));
                if (next !== indexRef.current) swap(next);
              },
            },
          });

          return () => {
            tlRef.current?.kill();
          };
        }
      );

      return () => mm.revert();
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
      <Marker index="02" title="Point of View" meta="What we believe" />

      <p className={s.statement}>
        <span className="sr-only">We design what doesn&rsquo;t exist yet.</span>
        <span className={`display ${s.line}`} aria-hidden="true">
          <span>We design</span>
        </span>
        <span className={`display ${s.line} ${s.lineB}`} aria-hidden="true">
          <span>What doesn&rsquo;t</span>
        </span>
        <span className={`display ${s.line} ${s.lineC}`} aria-hidden="true">
          <span>
            Exist yet<i className={s.stop}>.</i>
          </span>
        </span>
      </p>

      <p className="sr-only">{PAIRS.map((p) => `${p.a} to ${p.b}. ${p.note}`).join(' ')}</p>

      <div className={s.pinWrap} aria-hidden="true">
        <div className={s.mapping} ref={pinRef}>
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
