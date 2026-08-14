'use client';

import { useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { useGsap } from '@/lib/hooks';
import ProcessDiagram from '../canvas/ProcessDiagram';
import Marker from '../ui/Marker';
import s from './Process.module.css';

const STAGES = [
  { word: 'Question', note: 'Start with the brief behind the brief.' },
  { word: 'Explore', note: 'Go wide before going right.' },
  { word: 'Make', note: 'Build it to find out.' },
  { word: 'Break', note: 'Push until something gives.' },
  { word: 'Refine', note: 'Remove, then remove again.' },
  { word: 'Release', note: 'Ship it, then watch it.' },
];

export default function Process() {
  const root = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const idxRef = useRef(0);
  const [stage, setStage] = useState(0);

  /**
   * Reduced motion is handled by gsap.matchMedia and CSS, never by swapping
   * React trees: ScrollTrigger's pin moves the pinned node into a spacer it
   * creates itself, and re-rendering around that breaks reconciliation.
   */
  useGsap(
    () => {
      const word = wordRef.current;
      if (!word) return;

      const width = { v: 100 };

      const paint = (text: string) => {
        word.replaceChildren(
          ...[...text].map((ch) => {
            const span = document.createElement('span');
            span.className = s.char;
            span.textContent = ch;
            return span;
          })
        );
        return Array.from(word.children) as HTMLElement[];
      };

      // These nodes are written imperatively, so React must not own them.
      paint(STAGES[0].word);
      if (noteRef.current) noteRef.current.textContent = STAGES[0].note;

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const go = (next: number) => {
          const dir = next > idxRef.current ? 1 : -1;
          idxRef.current = next;
          setStage(next);

          const outgoing = Array.from(word.children) as HTMLElement[];

          gsap
            .timeline()
            .to(outgoing, {
              yPercent: -108 * dir,
              duration: 0.34,
              ease: 'power3.in',
              stagger: 0.022,
            })
            .to(noteRef.current, { yPercent: -110, duration: 0.3, ease: 'power3.in' }, 0)
            .add(() => {
              const chars = paint(STAGES[next].word);
              gsap.fromTo(
                chars,
                { yPercent: 108 * dir },
                { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.035 }
              );
              if (noteRef.current) noteRef.current.textContent = STAGES[next].note;
            })
            // The stage arrives condensed and opens out along the width axis.
            .fromTo(
              width,
              { v: 66 },
              {
                v: 100,
                duration: 1.2,
                ease: 'expo.out',
                onUpdate: () => {
                  word.style.fontStretch = `${width.v}%`;
                },
              },
              '<'
            )
            .fromTo(ruleRef.current, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'expo.out' }, '<')
            .fromTo(
              noteRef.current,
              { yPercent: 110 },
              { yPercent: 0, duration: 0.9, ease: 'expo.out' },
              '<'
            );
        };

        gsap.to(pinRef.current, {
          ease: 'none',
          scrollTrigger: {
            trigger: pinRef.current,
            start: 'top top',
            end: `+=${STAGES.length * 62}%`,
            pin: true,
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const next = Math.min(STAGES.length - 1, Math.floor(self.progress * STAGES.length));
              if (next !== idxRef.current) go(next);
            },
          },
        });
      });

      return () => mm.revert();
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
      <Marker index="04" title="How We Think" meta="Six stages, in order" />

      <p className="sr-only">{STAGES.map((x) => `${x.word}. ${x.note}`).join(' ')}</p>

      <div className={s.pin} ref={pinRef} aria-hidden="true">
        <div className={s.plate}>
          <div className={`${s.plateHead} mono mono--micro`}>
            <span>Route</span>
            <span>
              <b>{String(stage + 1).padStart(2, '0')}</b> / {STAGES.length} nodes
            </span>
          </div>
          <div className={s.diagram}>
            <ProcessDiagram stage={stage} />
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

            <div className={s.wordMask}>
              <span className={s.word} ref={wordRef} />
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

      {/* Shown by CSS only when motion is reduced — the pinned sequence above
          never advances without scroll-driven animation. */}
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
