'use client';

import { useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useGsap, useIsCoarse, useReducedMotion } from '@/lib/hooks';
import s from './Hero.module.css';

/**
 * Hero — a production sheet laid over a photograph.
 *
 * One continuous image sits behind the whole section. The grid above it is
 * a mix of two cell types: solid ink/red cells that fully occlude the photo
 * (type lives only here), and "window" cells that paint nothing and let it
 * through — some carrying a small label, most left empty on purpose, so the
 * photo reads as one large canvas the grid divides rather than a component
 * placed inside it. See README § The hero.
 */

const HEADLINE = ['We build brands', 'that hold together.'];
const LEAD = ['Strategy-led design across identity,', 'digital, product, packaging and space.'];
const LOGIC = ['One logic.', 'Every expression.'];

const WINDOW_AREAS = ['windowA', 'windowB', 'windowC', 'windowD', 'windowE'] as const;

const WINDOW_AREA_CLASS: Record<(typeof WINDOW_AREAS)[number], string> = {
  windowA: s.windowA,
  windowB: s.windowB,
  windowC: s.windowC,
  windowD: s.windowD,
  windowE: s.windowE,
};

type Technique = 'reveal' | 'crossfade' | 'cycle' | 'marquee' | 'ticker';

type WordCell = {
  area: 'wordA' | 'wordB' | 'wordC' | 'wordD' | 'wordE';
  technique: Technique;
  words: [string, string];
  surface: 'ink' | 'red';
};

/* Exactly the ten words the brief supplies, two per cell, five techniques —
   nothing invented. */
const WORD_CELLS: WordCell[] = [
  { area: 'wordA', technique: 'reveal', words: ['Build', 'Think'], surface: 'ink' },
  { area: 'wordB', technique: 'cycle', words: ['Strategy', 'Digital'], surface: 'red' },
  { area: 'wordC', technique: 'crossfade', words: ['Identity', 'Create'], surface: 'ink' },
  { area: 'wordD', technique: 'ticker', words: ['Marketing', 'Impact'], surface: 'red' },
  { area: 'wordE', technique: 'marquee', words: ['Brand', 'Product'], surface: 'ink' },
];

const AREA_CLASS: Record<WordCell['area'], string> = {
  wordA: s.wordA,
  wordB: s.wordB,
  wordC: s.wordC,
  wordD: s.wordD,
  wordE: s.wordE,
};

export default function Hero({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const coarse = useIsCoarse();

  useGsap(
    () => {
      const el = root.current;
      const grid = gridRef.current;
      if (!el || !grid) return;

      const cleanups: Array<() => void> = [];
      const bgImage = el.querySelector<HTMLElement>(`.${s.bgImage}`);

      /* --- Hover: highlight the cell under the pointer, dim the rest, and
         lift the shared background whenever the active cell is a window
         onto it. Plain DOM, not React state — the same imperative pattern
         the cursor and nav use for anything that changes on every pointer
         move or focus shift. */
      if (!coarse) {
        const dimmable = Array.from(grid.querySelectorAll<HTMLElement>(`.${s.dimmable}`));
        let active: HTMLElement | null = null;
        dimmable.forEach((cell) => {
          const isWindow = cell.dataset.window === 'true';
          const enter = () => {
            active = cell;
            grid.dataset.hovering = 'true';
            cell.dataset.active = 'true';
            if (isWindow && bgImage) bgImage.dataset.lift = 'true';
          };
          const leave = () => {
            cell.dataset.active = 'false';
            if (isWindow && bgImage) bgImage.dataset.lift = 'false';
            if (active === cell) {
              active = null;
              grid.dataset.hovering = 'false';
            }
          };
          cell.addEventListener('pointerenter', enter);
          cell.addEventListener('pointerleave', leave);
          cell.addEventListener('focus', enter);
          cell.addEventListener('blur', leave);
          cleanups.push(() => {
            cell.removeEventListener('pointerenter', enter);
            cell.removeEventListener('pointerleave', leave);
            cell.removeEventListener('focus', enter);
            cell.removeEventListener('blur', leave);
          });
        });
      }

      const stop = () => cleanups.forEach((fn) => fn());

      /* Reduced motion is a layout, not a switch: the JSX already renders
         each cell's resting frame (first word visible, second hidden) with
         no inline transform, so skipping the animation build is enough —
         there is nothing to reset. */
      if (reduced) return stop;

      const cells = grid.querySelectorAll<HTMLElement>(`.${s.cell}`);
      const chars = grid.querySelectorAll<HTMLElement>(`.${s.char}`);
      const lines = grid.querySelectorAll<HTMLElement>(`.${s.line}`);
      const tagEls = grid.querySelectorAll<HTMLElement>(`.${s.tag}`);
      const leadEl = grid.querySelector<HTMLElement>(`.${s.leadInner}`);
      const logicEl = grid.querySelector<HTMLElement>(`.${s.logicInner}`);
      const ctaEl = grid.querySelector<HTMLElement>(`.${s.cta}`);

      gsap.set(cells, { opacity: 0, scale: 0.96 });
      gsap.set(chars, { yPercent: 116, opacity: 0, rotateX: -45 });
      gsap.set(lines, { filter: 'blur(8px)' });
      if (bgImage) gsap.set(bgImage, { scale: 1.14 });
      gsap.set(tagEls, { opacity: 0, y: 6 });
      gsap.set([leadEl, logicEl, ctaEl], { opacity: 0, y: 12 });

      if (!ready) return stop;

      const loops = WORD_CELLS.map((w, i) => {
        const cellEl = grid.querySelector<HTMLElement>(`[data-area="${w.area}"]`);
        if (!cellEl) return null;
        const loop =
          w.technique === 'reveal'
            ? buildReveal(cellEl, 1.4)
            : w.technique === 'crossfade'
              ? buildCrossfade(cellEl, 1.9)
              : w.technique === 'cycle'
                ? buildCycle(cellEl, 1.5, 0.55)
                : w.technique === 'marquee'
                  ? buildMarquee(cellEl, 7.2)
                  : buildTicker(cellEl, 10);
        loop.delay(i * 0.42);
        return loop;
      });

      const tl = gsap.timeline();
      tl.to(
        cells,
        {
          opacity: 1,
          scale: 1,
          duration: 0.95,
          ease: 'power3.out',
          stagger: { each: 0.045, from: 'start' },
          clearProps: 'opacity,transform',
        },
        0
      )
        .to(bgImage, { scale: 1, duration: 1.7, ease: 'power2.out', clearProps: 'transform' }, 0.1)
        .to(tagEls, { opacity: 1, y: 0, duration: 0.8, stagger: 0.07 }, 0.2)
        .to(lines, { filter: 'blur(0px)', duration: 1.3, ease: 'power2.out', stagger: 0.08 }, 0.5)
        .to(
          chars,
          {
            yPercent: 0,
            opacity: 1,
            rotateX: 0,
            duration: 1.05,
            ease: 'expo.out',
            stagger: { each: 0.022, from: 'start' },
          },
          0.5
        )
        .to([leadEl, logicEl], { opacity: 1, y: 0, duration: 0.85, stagger: 0.1 }, 0.95)
        .to(
          ctaEl,
          { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', clearProps: 'opacity,transform' },
          1.1
        )
        .call(() => loops.forEach((l) => l?.play()), undefined, 1.25);

      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => loops.forEach((l) => (self.isActive ? l?.resume() : l?.pause())),
      });

      return () => {
        stop();
        tl.kill();
        loops.forEach((l) => l?.kill());
        st.kill();
      };
    },
    root,
    [ready, reduced, coarse]
  );

  return (
    <section
      className={`section ${s.hero}`}
      id="hero"
      data-section="hero"
      data-surface="ink"
      ref={root}
    >
      <div className={s.bg} aria-hidden="true">
        <img
          className={s.bgImage}
          src="/hero/crowd.jpg"
          srcSet="/hero/crowd-sm.jpg 760w, /hero/crowd.jpg 1254w"
          sizes="100vw"
          alt=""
          fetchPriority="high"
        />
        <div className={s.bgScrim} />
      </div>
      <p className="sr-only">
        Background: a lone figure standing still while a crowd blurs past in motion.
      </p>

      <div className={s.grid} ref={gridRef} data-hovering="false">
        {WINDOW_AREAS.map((area) => (
          <div
            key={area}
            className={`${s.cell} ${s.dimmable} ${s.window} ${WINDOW_AREA_CLASS[area]}`}
            data-window="true"
            data-cursor="View"
            aria-hidden="true"
          />
        ))}

        <div
          className={`${s.cell} ${s.dimmable} ${s.window} ${s.tags}`}
          data-window="true"
          data-cursor="View"
        >
          <span className={s.tag}>01 — Creative Studio</span>

          <span className={s.figBlock}>
            <span className={s.tag}>Fig. 01</span>
            <span className={`${s.tagCaption} serif`}>Held, while everything moves.</span>
          </span>

          <span className={s.tag}>Est. 2026 — Independent</span>

          <span className={s.tag}>
            <i className={s.dot} aria-hidden="true" />
            Open for commissions
          </span>

          <span className={`${s.tag} ${s.scrollCue}`}>
            Scroll
            <i aria-hidden="true">↓</i>
          </span>
        </div>

        <div className={`${s.cell} ${s.headline}`}>
          <h1 className={s.headlineInner}>
            <span className="sr-only">
              We build brands that hold together. 1:1 — Creative Studio.
            </span>
            {HEADLINE.map((line, li) => (
              <span className={s.line} key={line} aria-hidden="true">
                <span className={s.mask}>
                  {[...line].map((ch, i) => (
                    <span className={s.char} key={`${li}-${i}`}>
                      {ch === ' ' ? ' ' : ch}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </h1>
        </div>

        <div className={`${s.cell} ${s.lead}`}>
          <p className={s.leadInner}>
            {LEAD[0]}
            <br />
            {LEAD[1]}
          </p>
        </div>

        <div className={`${s.cell} ${s.logic}`}>
          <p className={s.logicInner}>
            {LOGIC[0]}
            <br />
            {LOGIC[1]}
          </p>
        </div>

        {WORD_CELLS.map((w) => (
          <div
            key={w.area}
            className={`${s.cell} ${s.dimmable} ${s.word} ${AREA_CLASS[w.area]} ${
              w.surface === 'ink' ? s.onInk : s.onRed
            }`}
            data-area={w.area}
            aria-hidden="true"
          >
            <WordContent technique={w.technique} words={w.words} />
          </div>
        ))}

        <a
          className={`${s.cell} ${s.dimmable} ${s.cta}`}
          href="#contact"
          data-cursor="Open"
          data-cursor-fill="true"
        >
          <span className={s.ctaLabel}>
            Start a
            <br />
            project
          </span>
          <span className={s.ctaArrowWrap}>
            {/* U+FE0E forces the text-style glyph — without it iOS renders
                this diagonal arrow with its emoji presentation. */}
            <i className={s.ctaArrow} aria-hidden="true">
              ↗︎
            </i>
          </span>
        </a>
      </div>
    </section>
  );
}

/* ==========================================================================
   WORD CELL CONTENT
   Every technique renders its full word list as static, React-owned markup —
   GSAP only ever tweens transform/opacity on it, never text content. See
   README § Conventions: "Text GSAP writes is not owned by React."
   ========================================================================== */

function WordContent({ technique, words }: { technique: Technique; words: [string, string] }) {
  if (technique === 'reveal') {
    return (
      <div className={s.stage}>
        {words.map((word, wi) => (
          <span className={s.stageWord} data-word key={wi} style={{ opacity: wi === 0 ? 1 : 0 }}>
            {[...word].map((ch, ci) => (
              <span className={s.letterMask} key={ci}>
                <span className={s.letter} data-letter>
                  {ch}
                </span>
              </span>
            ))}
          </span>
        ))}
      </div>
    );
  }

  if (technique === 'crossfade') {
    return (
      <div className={s.stage}>
        {words.map((word, wi) => (
          <span className={s.stageWord} data-word key={wi} style={{ opacity: wi === 0 ? 1 : 0 }}>
            {word}
          </span>
        ))}
      </div>
    );
  }

  if (technique === 'cycle') {
    return (
      <div className={s.stackMask}>
        <div className={s.stack3} data-track>
          <div className={s.stackItem}>{words[0]}</div>
          <div className={s.stackItem}>{words[1]}</div>
          <div className={s.stackItem}>{words[0]}</div>
        </div>
      </div>
    );
  }

  if (technique === 'marquee') {
    return (
      <div className={s.stackMask}>
        <div className={s.stack4} data-track>
          <div className={s.stackItem}>{words[0]}</div>
          <div className={s.stackItem}>{words[1]}</div>
          <div className={s.stackItem}>{words[0]}</div>
          <div className={s.stackItem}>{words[1]}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={s.rowMask}>
      <div className={s.row4} data-track>
        <div className={s.rowItem}>{words[0]}</div>
        <div className={s.rowItem}>{words[1]}</div>
        <div className={s.rowItem}>{words[0]}</div>
        <div className={s.rowItem}>{words[1]}</div>
      </div>
    </div>
  );
}

/* ==========================================================================
   LOOP BUILDERS
   Each returns a paused, repeat:-1 timeline. Durations are deliberately not
   round multiples of one another, so the five cells drift out of phase
   instead of ever re-syncing.
   ========================================================================== */

/** Letters stagger up and out, the next word staggers up and in. */
function buildReveal(cell: HTMLElement, hold: number): gsap.core.Timeline {
  const words = cell.querySelectorAll<HTMLElement>('[data-word]');
  const l1 = words[0]?.querySelectorAll<HTMLElement>('[data-letter]');
  const l2 = words[1]?.querySelectorAll<HTMLElement>('[data-letter]');
  if (!l1?.length || !l2?.length) return gsap.timeline();

  gsap.set(words, { opacity: 1 });
  gsap.set(l1, { yPercent: 0, opacity: 1 });
  gsap.set(l2, { yPercent: 100, opacity: 0 });

  return gsap
    .timeline({ repeat: -1, paused: true })
    .to(l1, { duration: hold })
    .to(l1, { yPercent: -100, opacity: 0, duration: 0.45, ease: 'power2.in', stagger: 0.028 })
    .fromTo(
      l2,
      { yPercent: 100, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.55, ease: 'expo.out', stagger: 0.032 },
      '<0.1'
    )
    .to(l2, { duration: hold })
    .to(l2, { yPercent: -100, opacity: 0, duration: 0.45, ease: 'power2.in', stagger: 0.028 })
    .fromTo(
      l1,
      { yPercent: 100, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.55, ease: 'expo.out', stagger: 0.032 },
      '<0.1'
    );
}

/** Whole-word crossfade, ping-ponged with gsap's own yoyo so both holds stay
 *  symmetrical. */
function buildCrossfade(cell: HTMLElement, hold: number): gsap.core.Timeline {
  const words = cell.querySelectorAll<HTMLElement>('[data-word]');
  const [w1, w2] = [words[0], words[1]];
  if (!w1 || !w2) return gsap.timeline();

  gsap.set(w1, { opacity: 1, scale: 1 });
  gsap.set(w2, { opacity: 0, scale: 0.92 });

  return gsap
    .timeline({ repeat: -1, yoyo: true, repeatDelay: hold, paused: true })
    .to(w1, { opacity: 0, scale: 1.06, duration: 0.6, ease: 'power2.inOut' }, 0)
    .to(w2, { opacity: 1, scale: 1, duration: 0.6, ease: 'power2.inOut' }, 0);
}

/** An odometer: holds on each word, steps to the next, snaps back on the
 *  (identical) third panel rather than reversing. */
function buildCycle(cell: HTMLElement, hold: number, step: number): gsap.core.Timeline {
  const track = cell.querySelector<HTMLElement>('[data-track]');
  if (!track) return gsap.timeline();
  gsap.set(track, { yPercent: 0 });

  return gsap
    .timeline({ repeat: -1, paused: true })
    .to(track, { duration: hold })
    .to(track, { yPercent: -33.3334, duration: step, ease: 'power3.inOut' })
    .to(track, { duration: hold })
    .to(track, { yPercent: -66.6668, duration: step, ease: 'power3.inOut' })
    .to(track, { duration: hold * 0.72 });
}

/** Continuous vertical ticker. The word list is doubled so a linear sweep of
 *  exactly half the track loops with no seam. */
function buildMarquee(cell: HTMLElement, duration: number): gsap.core.Timeline {
  const track = cell.querySelector<HTMLElement>('[data-track]');
  if (!track) return gsap.timeline();
  gsap.set(track, { yPercent: 0 });
  return gsap.timeline({ repeat: -1, paused: true }).to(track, { yPercent: -50, duration, ease: 'none' });
}

/** Same seamless-loop trick as the marquee, on the horizontal axis. */
function buildTicker(cell: HTMLElement, duration: number): gsap.core.Timeline {
  const track = cell.querySelector<HTMLElement>('[data-track]');
  if (!track) return gsap.timeline();
  gsap.set(track, { xPercent: 0 });
  return gsap.timeline({ repeat: -1, paused: true }).to(track, { xPercent: -50, duration, ease: 'none' });
}
