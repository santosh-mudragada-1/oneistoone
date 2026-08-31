'use client';

import { useRef, useState } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useGsap } from '@/lib/hooks';
import { createSequencer } from '@/lib/sequence';
import { createShatter } from '../type/shatter';
import { createSliceRig } from '../type/sliceRig';
import BrandAsset, { type AssetKind } from '../ui/BrandAsset';
import Marker from '../ui/Marker';
import s from './Build.module.css';

/**
 * The word is the system.
 *
 * There is no illustration in this section. The object being built, edited and
 * repeated is the word itself, and each of the three states performs its own
 * meaning on it:
 *
 *   BUILD   the letterforms arrive in pieces — the word cut into a grid of
 *           cells, each scattered and turned, called into place one at a time
 *           until it stands whole with its construction still showing.
 *   REFINE  the cuts go, the tracking closes, the width settles — and the
 *           colour is chosen. The picker steps down its column and the word
 *           takes each value in turn: grey where it lands, through the
 *           chromatic stops, out at off-white where it stays.
 *   SCALE   the finished word is surrounded by what the system turns into —
 *           a mark, a site, an app, a pack, a piece of motion — each one
 *           running its own closed loop.
 *
 * The state changes themselves run through the same band-shear the rest of the
 * site uses for a word becoming another word, gated by the same sequencer, so
 * a fast scroll gets whole transitions rather than torn ones.
 */

const STAGES = [
  {
    word: 'Build',
    note: 'Starting from zero? We build the strategy, identity and system from the ground up.',
  },
  {
    word: 'Refine',
    note: 'Already have a brand? We identify the gaps, remove the noise and bring everything back into alignment.',
  },
  {
    word: 'Scale',
    note: 'Growing fast? We create systems that your team can use, adapt and extend.',
  },
];

/* The colour, chosen while the word is being refined. A grey ramp, one value
   lighter each stop, and settles on the off-white it keeps — so the last
   swatch and the section's own text colour are the same value and there is
   nothing to reconcile when the picker leaves. */
const STOPS = ['#4A4A47', '#6B6B68', '#8D8D89', '#AEAEAB', '#D0D0CC', '#F1F1ED'];

/* What the system turns into. Each sits on one of the frame's three rules. */
const ASSETS: { kind: AssetKind; label: string; x: number; y: number; at: number }[] = [
  { kind: 'logo', label: 'Logo', x: 0.57, y: 0.3, at: 0.0 },
  { kind: 'web', label: 'Web', x: 0.79, y: 0.3, at: 0.12 },
  { kind: 'motion', label: 'Motion', x: 0.04, y: 0.98, at: 0.26 },
  { kind: 'app', label: 'App', x: 0.27, y: 0.98, at: 0.4 },
  { kind: 'pack', label: 'Packaging', x: 0.52, y: 0.98, at: 0.52 },
];

/** The rules the system is set on. */
const RULES = [0.28, 0.6, 0.94];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (v: number) => v * v * (3 - 2 * v);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

export default function Build() {
  const root = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const tileRef = useRef<HTMLSpanElement>(null);
  const cutsRef = useRef<HTMLSpanElement>(null);
  const noteRef = useRef<HTMLSpanElement>(null);
  const assetRefs = useRef<HTMLDivElement[]>([]);
  const ruleRefs = useRef<HTMLSpanElement[]>([]);
  const pickerRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [stage, setStage] = useState(0);
  const [swatch, setSwatch] = useState(-1);

  useGsap(
    () => {
      const host = wordRef.current;
      const plate = plateRef.current;
      const tiles = tileRef.current;
      const cuts = cutsRef.current;
      if (!host || !plate || !tiles || !cuts) return;

      // Seeded imperatively — React must not own text GSAP rewrites.
      const rig = createSliceRig(host, { align: 'left' });
      rig.set(STAGES[0].word);
      if (noteRef.current) noteRef.current.textContent = STAGES[0].note;

      const shatter = createShatter(tiles, 5, 7);
      shatter.set(STAGES[0].word);

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        /* The pieces are laid over the real word rather than beside it, so the
           hand-off from one to the other moves nothing. */
        const register = () => {
          tiles.style.transform = `translate(${host.offsetLeft}px, ${host.offsetTop}px)`;
        };
        register();

        /* Sequenced, so a fast scroll gets whole transitions rather than
           several torn ones — same gate the Studio and Process use. */
        let pick = -1;

        const seq = createSequencer((next, from, done) => {
          const dir = next > from ? 1 : -1;
          setStage(next);

          tlRef.current?.kill();
          const tl = gsap.timeline();
          tlRef.current = tl;

          rig.swap(STAGES[next].word, tl, 0);
          tl.call(done, undefined, rig.duration + 0.12);

          tl.to(noteRef.current, { opacity: 0, y: -8 * dir, duration: 0.35, ease: 'power2.in' }, 0)
            .add(() => {
              if (noteRef.current) noteRef.current.textContent = STAGES[next].note;
            }, 0.4)
            .fromTo(
              noteRef.current,
              { opacity: 0, y: 10 * dir },
              { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' },
              0.6
            );
        });

        const draw = (p: number) => {
          const stageEl = stageRef.current;
          if (!stageEl) return;
          const w = stageEl.clientWidth;
          const h = stageEl.clientHeight;
          if (!w || !h) return;

          const built = clamp01(p / 0.29);
          const precise = ease(clamp01((p - 0.36) / 0.28));
          const grow = ease(clamp01((p - 0.68) / 0.3));

          /* BUILD: the pieces come in, and the real word takes over from them
             only once they are exactly on top of it. */
          shatter.to(built);
          const handover = clamp01((built - 0.86) / 0.14);
          tiles.style.opacity = String(1 - handover);
          host.style.opacity = String(handover);

          /* REFINE: the cuts go, the tracking closes, the width settles.
             Tracking is held still while the pieces are still landing — moving
             it would slide the word out from under them. */
          plate.style.letterSpacing = `${mix(0.012, -0.052, precise).toFixed(4)}em`;
          plate.style.fontStretch = `${mix(94, 116, precise).toFixed(1)}%`;

          /* The colour is picked on a linear run, not the eased one, so each
             swatch is held for the same stretch of scroll. */
          const picking = p >= 0.345 && p < 0.675;
          const next = picking
            ? Math.min(STOPS.length - 1, Math.floor(clamp01((p - 0.36) / 0.28) * STOPS.length))
            : -1;
          if (next !== pick) {
            pick = next;
            setSwatch(next);
            plate.style.color = next < 0 ? '' : STOPS[next];
          }
          if (pickerRef.current) {
            pickerRef.current.style.opacity = (
              clamp01((p - 0.345) / 0.025) *
              (1 - clamp01((p - 0.655) / 0.025))
            ).toFixed(3);
          }

          const seams = (1 - precise) * built * 0.4;
          cuts.style.opacity = seams.toFixed(3);
          if (seams > 0.004) {
            cuts.style.width = `${host.offsetWidth}px`;
            cuts.style.height = `${host.offsetHeight}px`;
            cuts.style.transform = `translate(${host.offsetLeft}px, ${host.offsetTop}px)`;
            cuts.style.setProperty('--cw', `${host.offsetWidth / 7}px`);
            cuts.style.setProperty('--ch', `${host.offsetHeight / 5}px`);
          }

          /* SCALE: the original draws back and takes its place in a family
             rather than staying the only thing on the sheet. */
          /* The original keeps its place on the middle rule and stays the
             largest setting — the others are the family it now has, not a
             crowd it has been lost in. */
          const ph = plate.offsetHeight || 1;
          /* It takes its place before the family arrives around it — settling
             at the same rate they appear would have them landing on top of
             each other. */
          const settle = ease(clamp01(grow / 0.32));
          const sc = mix(1, 0.62, settle);
          plate.style.transform = `translate(${(w * 0.015 * settle).toFixed(1)}px, ${mix(
            (h - ph) / 2,
            RULES[1] * h - ph * 0.62,
            settle
          ).toFixed(1)}px) scale(${sc.toFixed(4)})`;

          ruleRefs.current.forEach((el) => {
            if (el) el.style.opacity = (grow * 0.9).toFixed(3);
          });

          assetRefs.current.forEach((el, i) => {
            if (!el) return;
            const q = ease(clamp01((grow - ASSETS[i].at) / 0.24));
            el.style.opacity = q.toFixed(3);
            // The card sits on its rule; the reveal is added to that, not
            // written over it.
            el.style.transform = `translateY(calc(-100% + ${((1 - q) * 22).toFixed(1)}px))`;
          });

          seq.to(Math.min(STAGES.length - 1, Math.floor(p * STAGES.length * 0.999)));
        };

        const st = ScrollTrigger.create({
          trigger: wrapRef.current,
          start: 'top top',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          onUpdate: (self) => draw(self.progress),
          onRefresh: (self) => {
            register();
            draw(self.progress);
          },
        });

        return () => {
          st.kill();
          tlRef.current?.kill();
        };
      });

      return () => {
        mm.revert();
        shatter.destroy();
        rig.destroy();
      };
    },
    root,
    []
  );

  return (
    <section
      className={`section ${s.section}`}
      id="build"
      data-section="build"
      data-surface="ink"
      ref={root}
    >
      <Marker index="04" title="What We Build" meta="One word, three states" />

      <p className="sr-only">
        Brand systems for businesses that are going somewhere.{' '}
        {STAGES.map((x) => `${x.word}. ${x.note}`).join(' ')}
      </p>

      <div className={s.pinWrap} ref={wrapRef} aria-hidden="true">
        <div className={s.pin}>
          <p className={s.lead}>Brand systems for businesses that are going somewhere.</p>

          <div className={s.stage} ref={stageRef}>
            {RULES.map((r, i) => (
              <span
                className={s.rule}
                key={r}
                style={{ top: `${r * 100}%` }}
                ref={(el) => {
                  if (el) ruleRefs.current[i] = el;
                }}
              />
            ))}

            {ASSETS.map((a, i) => (
              <div
                className={s.asset}
                key={a.kind}
                style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%` }}
                ref={(el) => {
                  if (el) assetRefs.current[i] = el;
                }}
              >
                <span className={`${s.assetLabel} mono mono--micro`}>{a.label}</span>
                <BrandAsset kind={a.kind} running={stage === 2} />
              </div>
            ))}

            <div className={s.plate} ref={plateRef}>
              <span ref={wordRef} />
              <span className={s.tiles} ref={tileRef} />
              <span className={s.cuts} ref={cutsRef} />
            </div>

            {/* The colour being chosen. Only on screen while it is being
                chosen, and gone by the time the system is set. */}
            <div className={s.picker} ref={pickerRef} style={{ opacity: 0 }}>
              {STOPS.map((hex, i) => (
                <span className={s.stop} key={hex} data-on={i === swatch}>
                  <b className="mono mono--micro">{hex.toUpperCase()}</b>
                  <i style={{ background: hex }} />
                </span>
              ))}
            </div>

            <span className={`${s.count} mono mono--micro`}>
              <b>{String(stage + 1).padStart(2, '0')}</b> / {STAGES.length}
            </span>
          </div>

          <div className={s.foot}>
            <p className={`${s.note} mono`}>
              <i>→</i>
              <span className={s.noteText} ref={noteRef} />
            </p>

            <ol className={`${s.rail} mono`}>
              {STAGES.map((item, i) => (
                <li
                  className={s.railItem}
                  key={item.word}
                  data-state={i === stage ? 'on' : i < stage ? 'done' : 'todo'}
                >
                  <span className={s.railNum}>{String(i + 1).padStart(2, '0')}</span>
                  {item.word}
                  <i className={s.railBar} />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Shown by CSS only when motion is reduced. */}
      <div className={s.staticView} aria-hidden="true">
        <p className={s.lead}>Brand systems for businesses that are going somewhere.</p>
        <ol className={s.staticList}>
          {STAGES.map((item, i) => (
            <li key={item.word}>
              <span className={`${s.railNum} mono`}>{String(i + 1).padStart(2, '0')}</span>
              <h3 className={s.staticWord}>{item.word}</h3>
              <p className={`${s.note} mono`}>
                <i>→</i>
                <span className={s.noteText}>{item.note}</span>
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
