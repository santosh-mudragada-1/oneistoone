'use client';

import { useRef, useState } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useGsap } from '@/lib/hooks';
import { createSequencer } from '@/lib/sequence';
import ProcessDiagram, { type DiagramDriver } from '../canvas/ProcessDiagram';
import { createSliceRig } from '../type/sliceRig';
import Marker from '../ui/Marker';
import s from './Process.module.css';

const STAGES = [
  { word: 'Discover', note: 'Understand the business, market, audience and opportunity.' },
  { word: 'Define', note: 'Turn insight into positioning, direction and system.' },
  { word: 'Create', note: 'Build the identity and experiences across every relevant touchpoint.' },
  { word: 'Scale', note: 'Create the tools and guidelines that keep the brand consistent as it grows.' },
];

export default function Process() {
  const root = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  /* Stage 00 is already arrived at: no leg drawn, its node fully present. */
  const driver = useRef<DiagramDriver>({ leg: -1, trail: 1, dot: 1 });
  const [stage, setStage] = useState(0);

  useGsap(
    () => {
      const host = wordRef.current;
      if (!host) return;

      // Seeded imperatively — React must not own text GSAP rewrites.
      const rig = createSliceRig(host, { align: 'left' });
      rig.set(STAGES[0].word);
      if (noteRef.current) noteRef.current.textContent = STAGES[0].note;

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        /**
         * The stage name is re-cut rather than replaced: it breaks into
         * horizontal bands that shear off, and the next word arrives through
         * the gaps from the other side. The diagram moves on the same
         * timeline, and moves in whichever direction the reader is going.
         *
         * Sequenced, so a fast scroll gets whole transitions rather than
         * several torn ones — and when stages are skipped the route jumps
         * straight to the last leg, which the diagram draws as already
         * travelled behind it.
         */
        const seq = createSequencer((next, from, done) => {
          const dir = next > from ? 1 : -1;

          setStage(next);

          tlRef.current?.kill();
          const tl = gsap.timeline();
          tlRef.current = tl;

          rig.swap(STAGES[next].word, tl, 0);
          tl.call(done, undefined, rig.duration + 0.12);

          /* The rule breathes with the word — it never resets to zero. */
          tl.to(ruleRef.current, { scaleX: 0.28, duration: 0.5, ease: 'power2.in' }, 0)
            .to(ruleRef.current, { scaleX: 1, duration: 1.05, ease: 'expo.out' }, 0.5)

            /* --- one line of copy ------------------------------------------ */
            .to(noteRef.current, { opacity: 0, y: -8 * dir, duration: 0.35, ease: 'power2.in' }, 0)
            .add(() => {
              if (noteRef.current) noteRef.current.textContent = STAGES[next].note;
            }, 0.4)
            .fromTo(
              noteRef.current,
              { opacity: 0, y: 10 * dir },
              { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' },
              0.6
            );

          /* The driver is set synchronously, before any tween renders: a
             delayed `fromTo` would leave the old leg drawn for a frame. */
          const d = driver.current;
          if (dir > 0) {
            // Forward: travel the last leg, and only then let the dot arrive.
            // Anything skipped over is behind `leg`, so it reads as settled.
            d.leg = next - 1;
            d.trail = 0;
            d.dot = 0;
            tl.to(d, { trail: 1, duration: 0.95, ease: 'power2.inOut' }, 0.12).to(
              d,
              { dot: 1, duration: 0.5, ease: 'back.out(2.2)' },
              1.07
            );
          } else {
            /* Backward: the same leg withdraws the way it came. The dot lets
               go first, so the line is never left hanging off a live node. */
            d.leg = next;
            d.trail = 1;
            d.dot = 1;
            tl.to(d, { dot: 0, duration: 0.45, ease: 'power2.in' }, 0.05).to(
              d,
              { trail: 0, duration: 0.95, ease: 'power2.inOut' },
              0.32
            );
          }
        });

        /* Progress only. The stage is held by native sticky. */
        const st = ScrollTrigger.create({
          trigger: wrapRef.current,
          start: 'top top',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            seq.to(
              Math.min(STAGES.length - 1, Math.floor(self.progress * STAGES.length * 0.999))
            );
          },
        });

        return () => {
          st.kill();
          tlRef.current?.kill();
        };
      });

      return () => {
        mm.revert();
        rig.destroy();
      };
    },
    root,
    []
  );

  return (
    <section
      className={`section ${s.section}`}
      id="process"
      data-section="process"
      data-surface="ink"
      ref={root}
    >
      <Marker index="05" title="Our Process" meta="Four moves." />

      <p className="sr-only">{STAGES.map((x) => `${x.word}. ${x.note}`).join(' ')}</p>

      <div className={s.pinWrap} ref={wrapRef} aria-hidden="true">
        <div className={s.pin}>
          <div className={s.plate}>
            <div className={`${s.plateHead} mono mono--micro`}>
              <span>Route</span>
              <span>
                <b>{String(stage + 1).padStart(2, '0')}</b> / {STAGES.length} moves
              </span>
            </div>
            <div className={s.diagram}>
              <ProcessDiagram driver={driver} />
            </div>
          </div>

          <div className={s.body}>
            <div className={s.stageWrap}>
              <div className={`${s.stageIdx} mono`}>
                <span>Stage</span>
                <b>{String(stage + 1).padStart(2, '0')}</b>
                <span className="op">:</span>
                <span className="faint">{String(STAGES.length).padStart(2, '0')}</span>
              </div>

              <div className={s.wordStage}>
                <span ref={wordRef} />
              </div>

              <div className={s.rule} ref={ruleRef} />

              <p className={`${s.note} mono`}>
                <i>→</i>
                <span className={s.noteText} ref={noteRef} />
              </p>
            </div>

            <ol className={`${s.rail} mono`}>
              <li className={s.railHead}>Sequence</li>
              {STAGES.map((item, i) => (
                <li
                  className={s.railItem}
                  key={item.word}
                  data-state={i === stage ? 'on' : i < stage ? 'done' : 'todo'}
                >
                  <i className={s.railDash} />
                  <span className={s.railNum}>{String(i + 1).padStart(2, '0')}</span>
                  {item.word}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Shown by CSS only when motion is reduced. */}
      <ol className={s.staticList} aria-hidden="true">
        {STAGES.map((item, i) => (
          <li className={s.staticItem} key={item.word}>
            <span className={`${s.stageIdx} mono`}>
              <b>{String(i + 1).padStart(2, '0')}</b>
            </span>
            <h3 className={s.staticWord}>{item.word}</h3>
            <p className={`${s.note} mono`}>
              <i>→</i>
              <span className={s.noteText}>{item.note}</span>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
