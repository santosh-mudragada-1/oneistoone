'use client';

import { useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { useGsap } from '@/lib/hooks';
import ProcessDiagram, { type DiagramDriver } from '../canvas/ProcessDiagram';
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

/* Width-axis and tracking values the word travels between. The outgoing word
   narrows to these and the incoming word starts from them, so the eye follows
   one continuous compression-and-release instead of a swap. */
const NARROW = { wdth: 62, track: -0.095 };
const OPEN = { wdth: 100, track: -0.055 };

export default function Process() {
  const root = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const layerA = useRef<HTMLSpanElement>(null);
  const layerB = useRef<HTMLSpanElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const idxRef = useRef(0);
  const frontRef = useRef(0);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const driver = useRef<DiagramDriver>({ trail: 1, dot: 1 });
  const [stage, setStage] = useState(0);

  useGsap(
    () => {
      const a = layerA.current;
      const b = layerB.current;
      if (!a || !b) return;

      const applyAxis = (el: HTMLElement, o: { wdth: number; track: number }) => {
        el.style.fontStretch = `${o.wdth}%`;
        el.style.letterSpacing = `${o.track}em`;
      };

      const paint = (el: HTMLElement, text: string) => {
        el.replaceChildren(
          ...[...text].map((ch) => {
            const span = document.createElement('span');
            span.className = s.char;
            span.textContent = ch;
            return span;
          })
        );
        return Array.from(el.children) as HTMLElement[];
      };

      // Seeded imperatively — React must not own text GSAP rewrites.
      paint(a, STAGES[0].word);
      applyAxis(a, OPEN);
      gsap.set(a, { opacity: 1 });
      gsap.set(b, { opacity: 0 });
      if (noteRef.current) noteRef.current.textContent = STAGES[0].note;

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const go = (next: number) => {
          const dir = next > idxRef.current ? 1 : -1;
          idxRef.current = next;
          setStage(next);

          const from = frontRef.current === 0 ? a : b;
          const to = frontRef.current === 0 ? b : a;
          frontRef.current = 1 - frontRef.current;

          const inChars = paint(to, STAGES[next].word);
          applyAxis(to, NARROW);
          gsap.set(to, { opacity: 0 });
          gsap.set(inChars, { opacity: 0, yPercent: 14 * dir });

          const outChars = Array.from(from.children) as HTMLElement[];
          const outAxis = { ...OPEN };
          const inAxis = { ...NARROW };

          tlRef.current?.kill();
          const tl = gsap.timeline();
          tlRef.current = tl;

          /* --- the word compresses out ------------------------------------ */
          tl.to(
            outAxis,
            {
              wdth: NARROW.wdth,
              track: NARROW.track,
              duration: 0.85,
              ease: 'power2.inOut',
              onUpdate: () => applyAxis(from, outAxis),
            },
            0
          )
            .to(from, { opacity: 0, duration: 0.8, ease: 'power2.in' }, 0.1)
            .to(
              outChars,
              { yPercent: -14 * dir, duration: 0.8, ease: 'power2.in', stagger: 0.018 },
              0
            )

            /* --- and opens back out as the next word ----------------------- */
            .to(
              inAxis,
              {
                wdth: OPEN.wdth,
                track: OPEN.track,
                duration: 1.25,
                ease: 'expo.out',
                onUpdate: () => applyAxis(to, inAxis),
              },
              0.32
            )
            .to(to, { opacity: 1, duration: 0.7, ease: 'power2.out' }, 0.32)
            .to(
              inChars,
              { opacity: 1, yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.028 },
              0.34
            )

            /* The rule breathes with the word — it never resets to zero. */
            .to(ruleRef.current, { scaleX: 0.28, duration: 0.5, ease: 'power2.in' }, 0)
            .to(ruleRef.current, { scaleX: 1, duration: 1, ease: 'expo.out' }, 0.5)

            /* --- one line of copy ------------------------------------------ */
            .to(noteRef.current, { opacity: 0, y: -8 * dir, duration: 0.35, ease: 'power2.in' }, 0)
            .add(() => {
              if (noteRef.current) noteRef.current.textContent = STAGES[next].note;
            })
            .fromTo(
              noteRef.current,
              { opacity: 0, y: 10 * dir },
              { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' },
              0.55
            )

            /* --- trail travels, and only then does the dot arrive ---------- */
            .fromTo(
              driver.current,
              { trail: 0 },
              { trail: 1, duration: 0.9, ease: 'power2.inOut' },
              0.15
            )
            .fromTo(
              driver.current,
              { dot: 0 },
              { dot: 1, duration: 0.5, ease: 'back.out(2.2)' },
              1.05
            );
        };

        gsap.to(pinRef.current, {
          ease: 'none',
          scrollTrigger: {
            trigger: pinRef.current,
            start: 'top top',
            // Generous dwell per stage so each one is read before it moves on.
            end: `+=${STAGES.length * 78}%`,
            pin: true,
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              const next = Math.min(STAGES.length - 1, Math.floor(self.progress * STAGES.length));
              if (next !== idxRef.current) go(next);
            },
          },
        });

        return () => {
          tlRef.current?.kill();
        };
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
            <ProcessDiagram stage={stage} driver={driver} />
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

            {/* Two layers, no mask. The transition is carried by the width
                axis, tracking and opacity — nothing here may clip a glyph. */}
            <div className={s.wordStage}>
              <span className={s.wordLayer} ref={layerA} />
              <span className={s.wordLayer} ref={layerB} />
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
