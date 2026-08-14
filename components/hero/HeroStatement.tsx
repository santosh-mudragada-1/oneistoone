'use client';

import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useGsap, useIsCoarse, useReducedMotion } from '@/lib/hooks';
import ServiceSketch from '../canvas/ServiceSketch';
import s from './HeroStatement.module.css';

/**
 * Hero.
 *
 * The sentence is the layout. Media sits inside the line rather than beside
 * it, so the type and the work occupy the same measure. Every chip is a live
 * generative sketch, not a placeholder image.
 */
export default function HeroStatement({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const coarse = useIsCoarse();

  /* Chips carry a little depth against the cursor — discovered, not obvious. */
  useEffect(() => {
    if (reduced || coarse) return;
    const el = root.current;
    if (!el) return;

    const chips = gsap.utils.toArray<HTMLElement>(`.${s.chip}, .${s.chipWide}`);
    const setters = chips.map((c) => ({
      x: gsap.quickTo(c, 'x', { duration: 1.1, ease: 'power3.out' }),
      y: gsap.quickTo(c, 'y', { duration: 1.1, ease: 'power3.out' }),
    }));

    const push = (nx: number, ny: number) => {
      setters.forEach((set, i) => {
        const depth = 0.4 + ((i * 3) % 4) * 0.28;
        set.x(nx * 26 * depth);
        set.y(ny * 18 * depth);
      });
    };

    /* Only track while the hero is actually on screen. Off screen the pointer
       sits far outside the section's box, and an unbounded offset is what left
       the composition scattered when the reader scrolled back up to it. */
    let onScreen = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        if (!onScreen) push(0, 0);
      },
      { threshold: 0 }
    );
    io.observe(el);

    const onMove = (e: PointerEvent) => {
      if (!onScreen) return;
      const r = el.getBoundingClientRect();
      // Clamped to the section's own box: the chips lean, they never travel.
      const nx = gsap.utils.clamp(-0.5, 0.5, (e.clientX - r.left) / r.width - 0.5);
      const ny = gsap.utils.clamp(-0.5, 0.5, (e.clientY - r.top) / r.height - 0.5);
      push(nx, ny);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      io.disconnect();
      chips.forEach((c) => gsap.killTweensOf(c));
    };
  }, [reduced, coarse]);

  useGsap(
    () => {
      if (!ready) return;
      const d = reduced ? 0.001 : 1;

      const WORDS = `.${s.word}`;
      const CHIPS = [`.${s.chip}`, `.${s.chipWide}`];
      const ARROW = `.${s.arrow} path`;
      const META = `.${s.meta} > *`;

      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

      tl.fromTo(WORDS, { yPercent: 108 }, { yPercent: 0, duration: d * 1.5, stagger: 0.07 }, 0)
        .fromTo(
          CHIPS,
          { scale: 0.6, opacity: 0, rotate: -6 },
          { scale: 1, opacity: 1, rotate: 0, duration: d * 1.3, stagger: 0.08 },
          0.35
        )
        // The arrow draws rather than fades — it should feel written.
        .fromTo(
          ARROW,
          { strokeDasharray: 460, strokeDashoffset: 460 },
          { strokeDashoffset: 0, duration: d * 1.4, ease: 'power2.inOut', stagger: 0.12 },
          0.75
        )
        .fromTo(META, { opacity: 0 }, { opacity: 1, duration: d, stagger: 0.1 }, 1.1);
    },
    root,
    [ready, reduced]
  );

  return (
    <section
      className={`section ${s.hero}`}
      id="hero"
      data-section="hero"
      data-surface="paper"
      ref={root}
    >
      <h1 className={s.headline}>
        <span className="sr-only">
          We design what doesn&rsquo;t exist yet. 1:1 — Creative Studio.
        </span>

        <span className={s.line} aria-hidden="true">
          <span className={s.wordMask}>
            <span className={s.word}>We</span>
          </span>
          <span className={s.chips}>
            <span className={s.chip}>
              <span className={s.chipCanvas}>
                <ServiceSketch mode={0} />
              </span>
            </span>
            <span className={s.chip}>
              <span className={s.chipCanvas}>
                <ServiceSketch mode={1} />
              </span>
            </span>
            <span className={s.chip}>
              <span className={s.chipCanvas}>
                <ServiceSketch mode={4} />
              </span>
            </span>
          </span>
          <span className={s.wordMask}>
            <span className={s.word}>design</span>
          </span>
        </span>

        <span className={`${s.line} ${s.lineB}`} aria-hidden="true">
          <span className={s.wordMask}>
            <span className={s.word}>what doesn&rsquo;t</span>
          </span>
          <svg className={s.arrow} viewBox="0 0 220 90" role="presentation">
            <path d="M8 66 C 42 12, 98 8, 122 36 C 136 52, 120 78, 101 69 C 84 61, 93 31, 124 27 C 158 22, 184 36, 207 48" />
            <path d="M188 31 L210 49 L184 62" />
          </svg>
        </span>

        <span className={`${s.line} ${s.lineC}`} aria-hidden="true">
          <span className={s.chipWide}>
            <span className={s.chipCanvas}>
              <ServiceSketch mode={2} />
            </span>
          </span>
          <span className={s.wordMask}>
            <span className={s.word}>exist yet.</span>
          </span>
        </span>
      </h1>

      <div className={`${s.meta} mono`}>
        <span>01 — Creative Studio</span>
        <span className="sr-only">Established 2026.</span>
        <span aria-hidden="true">Est. 2026</span>
        <span className={s.avail}>
          Open for commissions
          <i className={s.availDot} />
        </span>
      </div>
    </section>
  );
}
