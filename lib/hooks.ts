'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from './gsap';

export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** Scoped gsap.context that reverts on unmount — safe under StrictMode. */
export function useGsap(
  setup: (ctx: gsap.Context) => void,
  scope?: React.RefObject<HTMLElement | null>,
  deps: unknown[] = []
) {
  useIsoLayoutEffect(() => {
    const ctx = gsap.context((self) => setup(self), scope?.current ?? undefined);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
export const useIsCoarse = () => useMediaQuery('(hover: none), (pointer: coarse)');

/**
 * Pulls an element toward the cursor while it is hovered. Used on the few
 * controls that should feel physically reachable, not on every button.
 */
export function useMagnetic<T extends HTMLElement>(strength = 0.32, radius = 90) {
  const ref = useRef<T>(null);
  const reduced = useReducedMotion();
  const coarse = useIsCoarse();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || coarse) return;

    const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3.out' });

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      const falloff = Math.max(0, 1 - dist / (Math.max(r.width, r.height) / 2 + radius));
      xTo(dx * strength * falloff);
      yTo(dy * strength * falloff);
    };

    const onLeave = () => {
      xTo(0);
      yTo(0);
    };

    const zone = el.parentElement ?? el;
    zone.addEventListener('pointermove', onMove as EventListener);
    zone.addEventListener('pointerleave', onLeave);
    return () => {
      zone.removeEventListener('pointermove', onMove as EventListener);
      zone.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf(el);
    };
  }, [strength, radius, reduced, coarse]);

  return ref;
}

/**
 * Registers a draw callback on the shared gsap ticker, gated on the canvas
 * being in view. Keeps every sketch on one rAF loop and idle when offscreen.
 */
export function useSketch(
  ref: React.RefObject<HTMLCanvasElement | null>,
  init: (ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number) => void,
  /** `t` is milliseconds since the ticker started. */
  draw: (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => void,
  deps: unknown[] = [],
  opts: { fps?: number; dprCap?: number } = {}
) {
  const visible = useRef(false);
  const size = useRef({ w: 0, h: 0 });
  const initRef = useRef(init);
  const drawRef = useRef(draw);
  const optsRef = useRef(opts);
  initRef.current = init;
  drawRef.current = draw;
  optsRef.current = opts;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // These are procedural textures, not photography — extra device pixels
    // cost fill rate without reading as extra detail.
    const dpr = Math.min(window.devicePixelRatio || 1, optsRef.current.dprCap ?? 2);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size.current = { w: r.width, h: r.height };
      initRef.current(ctx, r.width, r.height, dpr);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
      },
      { rootMargin: '40px' }
    );
    io.observe(canvas);

    let lastDraw = -Infinity;

    // gsap.ticker reports elapsed *seconds*; sketches are authored in ms.
    const tick = (time: number) => {
      if (!visible.current) return;
      const ms = time * 1000;
      const cap = optsRef.current.fps;
      if (cap && ms - lastDraw < 1000 / cap) return;
      lastDraw = ms;
      drawRef.current(ctx, ms, size.current.w, size.current.h);
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Normalised pointer position relative to an element, smoothed by the caller. */
export function usePointerIn<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const pos = useRef({ x: 0.5, y: 0.5, active: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pos.current.x = (e.clientX - r.left) / r.width;
      pos.current.y = (e.clientY - r.top) / r.height;
      pos.current.active = true;
    };
    const onLeave = () => {
      pos.current.active = false;
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [ref]);

  return pos;
}

/** Stable callback ref for values read inside animation loops. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useEventCallback<A extends unknown[]>(fn: (...args: A) => void) {
  const ref = useLatest(fn);
  return useCallback((...args: A) => ref.current(...args), [ref]);
}
