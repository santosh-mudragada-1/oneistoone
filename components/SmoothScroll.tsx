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

    /* Lerp mode rather than duration mode: the position eases toward the
       target every frame, so the glide is frame-rate independent and keeps
       responding while the wheel is still moving instead of restarting a
       fixed-length tween on each notch. A low lerp is what gives the heavy,
       coasting feel. */
    const instance = new Lenis({
      lerp: 0.075,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
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
        lenis.scrollTo(target, {
          offset,
          duration: 1.6,
          easing: (t) => 1 - Math.pow(1 - t, 4),
        });
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
