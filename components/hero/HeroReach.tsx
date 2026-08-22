'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useGsap, useIsCoarse, useReducedMotion } from '@/lib/hooks';
import ReachField, { type FieldDriver } from './ReachField';
import s from './HeroReach.module.css';

/**
 * Hero — two hands, one ratio.
 *
 * The gesture is the mark: two hands reaching, and the gap between the
 * fingertips is the colon in 1:1. That is the only red on the screen. Behind
 * them an ASCII field thickens wherever a hand passes — the human gesture and
 * the digital system reading the same coordinates.
 *
 * Everything visual is on one canvas. This component owns only the type, and
 * writes to a driver the canvas reads, so the entrance, the cursor and the
 * scroll are all one choreography rather than three systems.
 */

const LINES = ['We design', "what doesn't", 'exist yet.'];

export default function HeroReach({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const coarse = useIsCoarse();

  const driver = useRef<FieldDriver>({
    settle: 0,
    presence: 0,
    ascii: 0,
    fade: 1,
    spread: 0,
    px: 0.5,
    py: 0.5,
    cursor: 0,
  });

  /* The cursor leans the nearer hand a few pixels. Written to the driver, not
     to the DOM — the canvas is the only thing that needs to know. */
  useEffect(() => {
    if (reduced || coarse) return;
    const el = root.current;
    if (!el) return;

    const to = gsap.quickTo(driver.current, 'cursor', { duration: 0.9, ease: 'power2.out' });
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      driver.current.px = gsap.utils.clamp(0, 1, (e.clientX - r.left) / r.width);
      driver.current.py = gsap.utils.clamp(0, 1, (e.clientY - r.top) / r.height);
      to(1);
    };
    const onLeave = () => to(0);

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      gsap.killTweensOf(driver.current);
    };
  }, [reduced, coarse]);

  useGsap(
    () => {
      const d = driver.current;

      /* Scroll only reports. No pin, no scrub on the page itself: the hands
         open the gap and the type takes on a little depth as the hero leaves,
         and the section scrolls away like any other. */
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom top',
        onUpdate: (self) => {
          const p = self.progress;
          // The hands let go of each other as the hero leaves.
          d.spread = p * window.innerWidth * 0.16;
          d.fade = gsap.utils.clamp(0, 1, 1 - p * 1.25);
        },
      });

      /* A little depth on the way out — the type leaves before the field. */
      const depth = gsap.to(`.${s.content}`, {
        y: reduced ? 0 : -60,
        opacity: reduced ? 1 : 0.25,
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
        },
      });

      const stop = () => {
        st.kill();
        depth.scrollTrigger?.kill();
        depth.kill();
      };

      if (!ready) return stop;

      const CHARS = `.${s.char}`;
      const dur = reduced ? 0.001 : 1;

      if (reduced) {
        Object.assign(d, { settle: 1, presence: 1, ascii: 0.75, cursor: 0 });
        gsap.set([CHARS, `.${s.lead}`, `.${s.actions} > *`, `.${s.meta}`, `.${s.colon}`], {
          opacity: 1,
          y: 0,
          scale: 1,
        });
        gsap.set(`.${s.line}`, { filter: 'none' });
        return stop;
      }

      const tl = gsap.timeline();

      tl
        /* 1 — the field forms out of black. */
        .to(d, { ascii: 0.85, duration: 1.4, ease: 'power2.out' }, 0)
        /* 2 — metadata, first thing legible. */
        .fromTo(`.${s.meta}`, { opacity: 0 }, { opacity: 1, duration: 0.9, stagger: 0.08 }, 0.15)
        /* 3 — the hands arrive out of the dark, then begin to reach. */
        .to(d, { presence: 1, duration: 1.9, ease: 'power2.inOut' }, 0.3)
        .to(d, { settle: 1, duration: 2.4, ease: 'power1.inOut' }, 0.5)
        /* 4 — the headline, letter by letter, choreographed not scattered. */
        .fromTo(
          CHARS,
          { yPercent: 118, opacity: 0, rotateX: -52 },
          {
            yPercent: 0,
            opacity: 1,
            rotateX: 0,
            duration: dur * 1.35,
            ease: 'expo.out',
            stagger: { each: 0.026, from: 'start' },
          },
          0.85
        )
        .fromTo(
          `.${s.line}`,
          { filter: 'blur(9px)' },
          { filter: 'blur(0px)', duration: 1.5, ease: 'power2.out', stagger: 0.08 },
          0.85
        )
        /* 5 — supporting line, then the actions. */
        .fromTo(`.${s.lead}`, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1 }, 1.5)
        .fromTo(
          `.${s.actions} > *`,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.9, stagger: 0.09 },
          1.7
        )
        /* 6 — the operator lands in the gap. The last thing to arrive. */
        .fromTo(
          `.${s.colon}`,
          { opacity: 0, scale: 0.3 },
          { opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(2.4)' },
          1.95
        );

      return () => {
        stop();
        tl.kill();
      };
    },
    root,
    [ready, reduced]
  );

  return (
    <section
      className={`section ${s.hero}`}
      id="hero"
      data-section="hero"
      data-surface="ink"
      ref={root}
    >
      <div className={s.field}>
        <ReachField driver={driver} reduced={reduced} />
      </div>
      <div className={s.vignette} aria-hidden="true" />

      {/* The gap between the fingertips, named. */}
      <div className={s.marks} aria-hidden="true">
        <span className={s.colon}>:</span>
      </div>

      <div className={s.content}>
        <div className={s.top}>
          <span className={`${s.meta} mono`}>01 — Creative Studio</span>
          <span className={`${s.meta} ${s.fig} mono mono--micro`}>
            Fig. 01
            <i>Two hands, one ratio</i>
          </span>
        </div>

        <div className={s.body}>
          <h1 className={s.headline}>
            <span className="sr-only">
              We design what doesn&rsquo;t exist yet. 1:1 — Creative Studio.
            </span>
            {LINES.map((line, li) => (
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

          <p className={s.lead}>
            An independent studio building brands, products and digital experiences
            <span className={s.leadKey}> at actual size.</span>
          </p>

          <div className={s.actions}>
            <a className={s.primary} href="#contact">
              Start a project
              <i aria-hidden="true">↗</i>
            </a>
            <a className={s.secondary} href="#approach">
              Explore
            </a>
          </div>
        </div>

        <div className={s.bottom}>
          <span className={`${s.meta} mono`}>Est. 2026 — Independent</span>
          <span className={`${s.meta} ${s.avail} mono`}>
            <i className={s.dot} />
            Open for commissions
          </span>
          <span className={`${s.meta} ${s.scroll} mono`}>
            Scroll
            <i aria-hidden="true">↓</i>
          </span>
        </div>
      </div>
    </section>
  );
}
