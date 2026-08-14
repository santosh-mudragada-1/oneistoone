'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useGsap, useIsCoarse, useMediaQuery, useReducedMotion } from '@/lib/hooks';
import { MARK_H, MARK_W, markState } from './system';
import s from './HeroAperture.module.css';

/**
 * Hero — Aperture.
 *
 * Six framed cards, each a window onto the same giant 1:1 mark drifting behind
 * the page. The mark is never shown whole: the reader assembles it from
 * fragments. One card resolves it as a dither, so the same object is being read
 * at two resolutions at once.
 */

type Card = {
  label?: string;
  align?: 'left' | 'right';
  x: number;
  y: number;
  w: number;
  h: number;
  dither?: boolean;
  depth: number;
};

const CARDS: Card[] = [
  { label: 'Idea', align: 'left', x: 0.29, y: 0.345, w: 0.205, h: 0.26, dither: true, depth: 0.5 },
  { label: 'Form', align: 'left', x: 0.574, y: 0.17, w: 0.078, h: 0.265, depth: 0.9 },
  { label: 'Craft', align: 'right', x: 0.55, y: 0.5, w: 0.26, h: 0.185, depth: 0.35 },
  { label: 'System', align: 'right', x: 0.285, y: 0.625, w: 0.222, h: 0.145, depth: 0.7 },
  { x: 0.749, y: 0.24, w: 0.224, h: 0.118, depth: 0.2 },
  { x: 0.029, y: 0.46, w: 0.143, h: 0.21, depth: 0.6 },
];

/* Portrait gets fewer, wider windows. The desktop percentages become slivers
   at phone widths, and a sliver shows nothing. */
const CARDS_SM: Card[] = [
  { label: 'Idea', align: 'left', x: 0.07, y: 0.27, w: 0.47, h: 0.2, dither: true, depth: 0.5 },
  { label: 'Form', align: 'left', x: 0.6, y: 0.15, w: 0.33, h: 0.23, depth: 0.9 },
  { label: 'Craft', align: 'right', x: 0.45, y: 0.51, w: 0.48, h: 0.17, depth: 0.35 },
  { label: 'System', align: 'right', x: 0.06, y: 0.55, w: 0.33, h: 0.15, depth: 0.7 },
];

/** 4×4 Bayer matrix, normalised — the threshold pattern for the dithered card. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((r) => r.map((v) => (v + 0.5) / 16));

export default function HeroAperture({
  ready,
  intro = true,
}: {
  ready: boolean;
  /** False when swapped in mid-session — see HeroStatement. */
  intro?: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const smoothRef = useRef<HTMLCanvasElement>(null);
  const ditherRef = useRef<HTMLCanvasElement>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);
  const reduced = useReducedMotion();
  const coarse = useIsCoarse();
  const small = useMediaQuery('(max-width: 860px)');
  const cards = small ? CARDS_SM : CARDS;
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  /* --- The artwork ------------------------------------------------------- */
  useEffect(() => {
    const stage = stageRef.current;
    const smooth = smoothRef.current;
    const dither = ditherRef.current;
    if (!stage || !smooth || !dither) return;

    const sCtx = smooth.getContext('2d');
    const dCtx = dither.getContext('2d');
    if (!sCtx || !dCtx) return;

    // Low-resolution buffer the dithered card is sampled from.
    const buf = document.createElement('canvas');
    const bCtx = buf.getContext('2d', { willReadFrequently: true });
    if (!bCtx) return;

    const CELL = 7;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const progress = { v: 0 };
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

    const rectOf = (c: Card) => ({
      x: c.x * w,
      y: c.y * h,
      x2: (c.x + c.w) * w,
      y2: (c.y + c.h) * h,
    });

    const applyClips = () => {
      const toPath = (list: Card[]) =>
        list
          .map((c) => {
            const r = rectOf(c);
            return `M${r.x.toFixed(1)} ${r.y.toFixed(1)}H${r.x2.toFixed(1)}V${r.y2.toFixed(
              1
            )}H${r.x.toFixed(1)}Z`;
          })
          .join(' ');
      const set = cardsRef.current;
      smooth.style.clipPath = `path("${toPath(set.filter((c) => !c.dither))}")`;
      dither.style.clipPath = `path("${toPath(set.filter((c) => c.dither))}")`;
    };

    const resize = () => {
      w = stage.clientWidth || 1;
      h = stage.clientHeight || 1;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      [smooth, dither].forEach((c) => {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      });
      sCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buf.width = Math.max(2, Math.ceil(w / CELL));
      buf.height = Math.max(2, Math.ceil(h / CELL));
      applyClips();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(stage);

    /* Three copies of the mark at different scales, drifting at different
       rates. A single 1:1 is mostly negative space, so the windows would land
       on emptiness; interlocking copies keep every aperture full while the
       form stays unmistakably the identity. */
    const LAYERS = [
      { k: 1.0, spin: 9000, drift: 13000, ox: 0.0, oy: 0.0, tone: 1 },
      { k: 0.58, spin: -6600, drift: 10400, ox: 0.19, oy: -0.15, tone: 0.86 },
      { k: 1.62, spin: 15800, drift: 17200, ox: -0.17, oy: 0.16, tone: 0.5 },
    ];

    const mark = markState();

    const paint = (ctx: CanvasRenderingContext2D, cw: number, ch: number, t: number) => {
      const p = progress.v;

      LAYERS.forEach((L) => {
        const S = cw * (0.2 + p * 0.12) * L.k;
        const rot = Math.sin(t / L.spin) * 0.24 + p * 0.4 * Math.sign(L.spin);
        const cx =
          cw * (0.52 + L.ox + Math.sin(t / L.drift) * 0.03) + pointer.sx * 24 * L.k;
        const cy =
          ch * (0.5 + L.oy + Math.cos(t / (L.drift * 0.86)) * 0.032) -
          p * ch * 0.1 +
          pointer.sy * 17 * L.k;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.translate((-MARK_W * S) / 2, (-MARK_H * S) / 2);

        mark.forEach((r, i) => {
          const x = r.x * S;
          const y = r.y * S;
          const rw = r.sx * S;
          const rh = r.sy * S;
          const g = ctx.createLinearGradient(x, y, x + rw * 0.35, y + rh);
          const tone = (0.6 + ((i * 5) % 7) * 0.055) * L.tone;
          g.addColorStop(0, `rgba(255,255,255,${Math.min(1, tone + 0.32)})`);
          g.addColorStop(1, `rgba(228,232,240,${tone})`);
          ctx.fillStyle = g;
          ctx.fillRect(x, y, rw, rh);
        });

        ctx.restore();
      });
    };

    const drawDither = (t: number) => {
      const bw = buf.width;
      const bh = buf.height;
      bCtx.setTransform(1, 0, 0, 1, 0, 0);
      bCtx.clearRect(0, 0, bw, bh);
      bCtx.save();
      bCtx.scale(bw / w, bh / h);
      paint(bCtx, w, h, t);
      bCtx.restore();

      const data = bCtx.getImageData(0, 0, bw, bh).data;
      dCtx.clearRect(0, 0, w, h);
      dCtx.fillStyle = '#f1f1ed';
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
          const i = (y * bw + x) * 4;
          const lum = (data[i] / 255) * (data[i + 3] / 255);
          if (lum > BAYER[y & 3][x & 3]) dCtx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }
    };

    const st = ScrollTrigger.create({
      trigger: root.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        progress.v = self.progress;
      },
    });

    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / r.width - 0.5;
      pointer.y = (e.clientY - r.top) / r.height - 0.5;
    };
    if (!reduced && !coarse) window.addEventListener('pointermove', onMove, { passive: true });

    let inView = true;
    const io = new IntersectionObserver(([e]) => (inView = e.isIntersecting), {
      rootMargin: '10%',
    });
    io.observe(stage);

    const tick = (time: number) => {
      if (!inView) return;
      const t = time * 1000;
      pointer.sx += (pointer.x - pointer.sx) * 0.05;
      pointer.sy += (pointer.y - pointer.sy) * 0.05;
      sCtx.clearRect(0, 0, w, h);
      paint(sCtx, w, h, t);
      drawDither(t);
    };

    if (reduced) {
      sCtx.clearRect(0, 0, w, h);
      paint(sCtx, w, h, 0);
      drawDither(0);
    } else {
      gsap.ticker.add(tick);
    }

    return () => {
      gsap.ticker.remove(tick);
      st.kill();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  }, [reduced, coarse, small]);

  /* --- Entrance and scroll ------------------------------------------------ */
  useGsap(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Cards drift at different rates, so the plane has depth.
        cardRefs.current.filter(Boolean).forEach((el, i) => {
          gsap.to(el, {
            y: () => -(cardsRef.current[i]?.depth ?? 0.5) * 120,
            ease: 'none',
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 0.6,
            },
          });
        });

        gsap.to(`.${s.markInner}`, {
          xPercent: -6,
          ease: 'none',
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.8,
          },
        });
      });

      if (!ready) return () => mm.revert();

      const REST = [`.${s.tagline}`, `.${s.card}`, `.${s.markInner}`, `.${s.meta}`, `.${s.scrollCue}`];

      /* Swapped in rather than revealed: land at rest and fade the sheet. */
      if (!intro) {
        gsap.set(REST, { opacity: 1, scale: 1, x: 0, y: 0, yPercent: 0 });
        gsap.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
        return () => mm.revert();
      }

      const d = reduced ? 0.001 : 1;
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .fromTo(`.${s.tagline}`, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: d * 1.3 }, 0)
        .fromTo(
          `.${s.card}`,
          { opacity: 0, scale: 0.94, y: 26 },
          { opacity: 1, scale: 1, y: 0, duration: d * 1.5, stagger: 0.09 },
          0.15
        )
        .fromTo(
          `.${s.markInner}`,
          { yPercent: 42, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: d * 1.8 },
          0.5
        )
        .fromTo(
          [`.${s.meta}`, `.${s.scrollCue}`],
          { opacity: 0 },
          { opacity: 1, duration: d * 1.1, stagger: 0.08 },
          1.1
        );

      return () => mm.revert();
    },
    root,
    [ready, reduced, intro]
  );

  return (
    <section
      className={`section ${s.hero}`}
      id="hero"
      data-section="hero"
      data-surface="ink"
      ref={root}
    >
      <div className={s.sticky} ref={stageRef}>
        <div className={s.wash} aria-hidden="true" />
        <div className={s.rules} aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} />
          ))}
        </div>

        <canvas className={s.plate} ref={smoothRef} aria-hidden="true" />
        <canvas className={s.plate} ref={ditherRef} aria-hidden="true" />

        <h1 className="sr-only">1:1 — Creative Studio. Design without defaults.</h1>

        <p className={s.tagline} aria-hidden="true">
          Design without defaults.
          <br />
          Built at actual size.
        </p>

        {cards.map((c, i) => (
          <div
            key={i}
            className={s.card}
            aria-hidden="true"
            ref={(el) => {
              if (el) cardRefs.current[i] = el;
            }}
            style={{
              left: `${c.x * 100}%`,
              top: `${c.y * 100}%`,
              width: `${c.w * 100}%`,
              height: `${c.h * 100}%`,
            }}
          >
            {c.label ? (
              <span
                className={`${s.cardLabel} ${c.align === 'right' ? s.labelRight : s.labelLeft}`}
              >
                {c.label}
              </span>
            ) : null}
          </div>
        ))}

        <div className={s.mark} aria-hidden="true">
          <span className={s.markInner}>One to One</span>
        </div>

        <div className={`${s.meta} mono mono--micro`} aria-hidden="true">
          <span>01 — Creative Studio</span>
          <span>Est. 2026</span>
        </div>

        <div className={s.scrollCue} aria-hidden="true">
          <span>Scroll</span>
          <span className={s.cueRing}>
            <i className={s.cueArrow}>↓</i>
          </span>
        </div>
      </div>
    </section>
  );
}
