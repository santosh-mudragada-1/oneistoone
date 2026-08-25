'use client';

import { useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { useGsap, useIsCoarse, useReducedMotion } from '@/lib/hooks';
import SituationLoop, { type LoopKind } from '../ui/SituationLoop';
import Marker from '../ui/Marker';
import s from './Situations.module.css';

/**
 * Three worlds, and the ground they all start from.
 *
 * The opening statement is the ground: a foundation, before anything stands on
 * it. Then three framed pieces, each a closed loop in solid geometry — the
 * same parts re-arranged, one point opening outward for ever, six separate
 * runs brought onto one. They are drawn from the same vocabulary at the same
 * weight, so the row reads as one practice seen three times.
 *
 * The frames are hairlines and nothing else: no radius, no shadow, no plate.
 * The title sits inside the frame, over the empty upper corner of its world,
 * the way a plate title sits on a drawing.
 */

const CARDS: { word: string; note: string; mode: LoopKind }[] = [
  { word: 'Rebranding', note: 'Bring the business and brand back together.', mode: 'rebuild' },
  { word: 'Scaling', note: 'Create a system that grows with you.', mode: 'grow' },
  { word: 'Connecting', note: 'Make existing touch-points feel like one brand.', mode: 'connect' },
];

export default function Situations() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const coarse = useIsCoarse();
  const reduced = useReducedMotion();

  useGsap(
    () => {
      const dur = reduced ? 0.001 : 1.2;

      gsap.fromTo(
        `.${s.openWord}`,
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: dur,
          ease: 'expo.out',
          scrollTrigger: { trigger: `.${s.opening}`, start: 'top 84%' },
        }
      );

      /* The frames open from their own baseline, one after another, so the row
         resolves left to right rather than arriving as a block. */
      gsap.fromTo(
        `.${s.frame}`,
        { clipPath: 'inset(100% 0% 0% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: reduced ? 0.001 : 1.35,
          ease: 'expo.out',
          stagger: 0.12,
          scrollTrigger: { trigger: `.${s.row}`, start: 'top 82%' },
        }
      );

      gsap.fromTo(
        [`.${s.word}`, `.${s.note}`, `.${s.idx}`],
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: reduced ? 0.001 : 0.9,
          ease: 'expo.out',
          stagger: 0.06,
          scrollTrigger: { trigger: `.${s.row}`, start: 'top 78%' },
        }
      );
    },
    root,
    [reduced]
  );

  return (
    <section
      className={`section ${s.section}`}
      id="clients"
      data-section="clients"
      data-surface="ink"
      ref={root}
    >
      <Marker index="08" title="Who We Work With" meta="Four entry points" />

      <p className={s.lead}>For businesses that are building, changing or scaling.</p>

      {/* Before any of the three: the ground they are all built on. */}
      <div className={s.opening}>
        <h3 className={s.openMask}>
          <span className={s.openWord}>Starting fresh</span>
        </h3>
        <p className={`${s.openNote} mono`}>
          <i aria-hidden="true">→</i>
          Build the foundation.
        </p>
      </div>

      <div className={s.row} data-hot={active !== null} onPointerLeave={() => setActive(null)}>
        {CARDS.map((card, i) => (
          <article
            className={s.card}
            key={card.word}
            data-active={active === i}
            onPointerEnter={() => !coarse && setActive(i)}
          >
            <span className={`${s.idx} mono`}>{String(i + 1).padStart(2, '0')}</span>

            <div className={s.frame}>
              <SituationLoop kind={card.mode} running={!reduced} />
              <h3 className={s.word}>{card.word}</h3>
              <span className={s.rule} aria-hidden="true" />
            </div>

            <p className={`${s.note} mono`}>{card.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
