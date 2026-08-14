'use client';

import Lenis from 'lenis';
import { createContext, useContext, useEffect, useState } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/hooks';

type LenisApi = {
  lenis: Lenis | null;
  scrollTo: (target: string | number | HTMLElement, offset?: number) => void;
  lock: () => void;
  unlock: () => void;
};

const Ctx = createContext<LenisApi>({
  lenis: null,
  scrollTo: () => {},
  lock: () => {},
  unlock: () => {},
});

export const useSmoothScroll = () => useContext(Ctx);

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      ScrollTrigger.refresh();
      return;
    }

    const instance = new Lenis({
      duration: 1.15,
      // Long tail-off — the scroll should coast to a stop, not snap.
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
      syncTouch: false,
    });

    instance.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);

    setLenis(instance);
    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(raf);
      instance.destroy();
      setLenis(null);
    };
  }, [reduced]);

  const api: LenisApi = {
    lenis,
    scrollTo: (target, offset = 0) => {
      if (lenis) {
        lenis.scrollTo(target, { offset, duration: 1.5 });
        return;
      }
      const el =
        typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
      if (el instanceof HTMLElement) {
        window.scrollTo({ top: el.offsetTop + offset, behavior: 'smooth' });
      }
    },
    lock: () => {
      lenis?.stop();
      document.body.style.overflow = 'hidden';
    },
    unlock: () => {
      lenis?.start();
      document.body.style.overflow = '';
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
