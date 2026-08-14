'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

  /* Lenis drives scroll from gsap.ticker. Lag smoothing would let the ticker
     skip frames and desync the two, so it stays off. */
  gsap.ticker.lagSmoothing(0);

  gsap.defaults({ ease: 'power3.out', duration: 1 });
}

export { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin };
