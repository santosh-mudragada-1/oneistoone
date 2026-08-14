'use client';

import { useRef, useState } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
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

/** Small, deterministic per-character angles — choreographed, not random. */
const tilt = (i: number) => ((i % 3) - 1) * 5;

export default function Process() {
  const root = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
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
      gsap.set(a, { opacity: 1 });
      gsap.set(b, { opacity: 0 });
      if (noteRef.current) noteRef.current.textContent = STAGES[0].note;

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        /**
         * The word does not change — it rearranges. Outgoing characters
         * separate and drift apart; each incoming character is placed at the
         * position an outgoing character just occupied and travels from there
         * into its own slot. The eye follows individual letters across, so it
         * reads as one typographic object reforming.
         */
        const go = (next: number) => {
          const dir = next > idxRef.current ? 1 : -1;
          idxRef.current = next;
          setStage(next);

          const from = frontRef.current === 0 ? a : b;
          const to = frontRef.current === 0 ? b : a;
          frontRef.current = 1 - frontRef.current;

          const outChars = Array.from(from.children) as HTMLElement[];
          const outX = outChars.map((c) => c.offsetLeft);

          const inChars = paint(to, STAGES[next].word);
          gsap.set(to, { opacity: 1 });
          const inX = inChars.map((c) => c.offsetLeft);

          // Each new letter starts where an old letter was standing.
          inChars.forEach((c, i) => {
            const src = outX.length ? outX[i % outX.length] : inX[i];
            gsap.set(c, {
              x: src - inX[i],
              y: 18 * dir,
              rotate: -tilt(i),
              opacity: 0,
              transformOrigin: '50% 50%',
            });
          });

          const mid = (outChars.length - 1) / 2;

          tlRef.current?.kill();
          const tl = gsap.timeline();
          tlRef.current = tl;

          tl
            /* --- the word comes apart -------------------------------------- */
            .to(
              outChars,
              {
                x: (i: number) => (i - mid) * 40,
                y: -16 * dir,
                rotate: (i: number) => tilt(i),
                opacity: 0,
                duration: 0.75,
                ease: 'power2.in',
                stagger: { each: 0.028, from: 'center' },
              },
              0
            )
            .to(from, { letterSpacing: '0.04em', duration: 0.75, ease: 'power2.in' }, 0)
            .set(from, { opacity: 0 }, 0.76)

            /* --- and reassembles as the next one --------------------------- */
            .fromTo(
              to,
              { letterSpacing: '0.06em' },
              { letterSpacing: '-0.055em', duration: 1.25, ease: 'expo.out' },
              0.3
            )
            .to(
              inChars,
              {
                x: 0,
                y: 0,
                rotate: 0,
                opacity: 1,
                duration: 1.2,
                ease: 'expo.out',
                stagger: { each: 0.038, from: 'start' },
              },
              0.3
            )

            /* The rule breathes with the word — it never resets to zero. */
            .to(ruleRef.current, { scaleX: 0.28, duration: 0.5, ease: 'power2.in' }, 0)
            .to(ruleRef.current, { scaleX: 1, duration: 1.05, ease: 'expo.out' }, 0.5)

            /* --- one line of copy ------------------------------------------ */
            .to(noteRef.current, { opacity: 0, y: -8 * dir, duration: 0.35, ease: 'power2.in' }, 0)
            .add(() => {
              if (noteRef.current) noteRef.current.textContent = STAGES[next].note;
            })
            .fromTo(
              noteRef.current,
              { opacity: 0, y: 10 * dir },
              { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' },
              0.6
            )

            /* --- trail travels, and only then does the dot arrive ---------- */
            .fromTo(
              driver.current,
              { trail: 0 },
              { trail: 1, duration: 0.95, ease: 'power2.inOut' },
              0.12
            )
            .fromTo(
              driver.current,
              { dot: 0 },
              { dot: 1, duration: 0.5, ease: 'back.out(2.2)' },
              1.07
            );
        };

        /* Progress only. The stage is held by native sticky. */
        const st = ScrollTrigger.create({
          trigger: wrapRef.current,
          start: 'top top',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const next = Math.min(
              STAGES.length - 1,
              Math.floor(self.progress * STAGES.length * 0.999)
            );
            if (next !== idxRef.current) go(next);
          },
        });

        return () => {
          st.kill();
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

      <div className={s.pinWrap} ref={wrapRef} aria-hidden="true">
        <div className={s.pin}>
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

              {/* Two layers, no mask. Characters travel between words, so
                  nothing here may clip a glyph. */}
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
