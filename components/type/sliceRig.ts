import { gsap } from '@/lib/gsap';
import s from './sliceRig.module.css';

/**
 * A word that changes by shearing.
 *
 * The word is cut into horizontal bands. Outgoing bands slide off in
 * alternating directions and the incoming bands arrive through them from the
 * opposite side, so for a moment both words are on the page, interleaved
 * strip by strip. It is one typographic object being re-cut, not two words
 * cross-fading.
 *
 * Every band is a full copy of the word inside the host element, clipped to
 * its strip — so the face, size, tracking, colour and stroke are whatever the
 * section already set. The rig never styles type itself.
 */

export type SliceOptions = {
  /** Number of horizontal strips. Odd reads better: there is a centre band. */
  bands?: number;
  /** Which edge the word is set from. */
  align?: 'left' | 'right';
  /** Furthest a band travels, as a multiple of the type size. Measured
   *  against the type rather than the word's width so a short word shears as
   *  hard as a long one. */
  travel?: number;
};

export type SliceRig = {
  /** Place a word with no transition. */
  set(text: string): void;
  /** Append the swap to an existing timeline, so it stays in step with the
   *  rest of the section. */
  swap(text: string, tl: gsap.core.Timeline, at?: number): void;
  /** How long a swap runs, for scheduling whatever follows it. */
  readonly duration: number;
  destroy(): void;
};

const DURATION = 1.25;

export function createSliceRig(host: HTMLElement, opts: SliceOptions = {}): SliceRig {
  const bands = opts.bands ?? 7;
  const align = opts.align ?? 'left';
  const travel = opts.travel ?? 0.92;

  host.classList.add(s.rig);
  host.dataset.align = align;

  const sizer = document.createElement('span');
  sizer.className = s.sizer;
  host.replaceChildren(sizer);

  let live: HTMLElement[] = [];
  let retiring: HTMLElement[] = [];

  /* Bands overlap very slightly, otherwise sub-pixel rounding leaves a hairline
     of background between adjacent strips. */
  const strip = (b: number) => {
    const bleed = 0.4;
    const top = Math.max(0, (b / bands) * 100 - bleed);
    const bottom = Math.max(0, 100 - ((b + 1) / bands) * 100 - bleed);
    return `inset(${top.toFixed(3)}% 0 ${bottom.toFixed(3)}% 0)`;
  };

  /* Deterministic, not random: bands alternate direction and take one of three
     distances, so the break-up is choreographed and repeats identically. */
  const throwOf = (b: number) => (b % 2 ? -1 : 1) * (0.5 + ((b * 5) % 3) * 0.32);

  const build = (text: string) => {
    const made: HTMLElement[] = [];
    for (let b = 0; b < bands; b++) {
      const el = document.createElement('span');
      el.className = s.slice;
      el.textContent = text;
      el.style.clipPath = strip(b);
      host.appendChild(el);
      made.push(el);
    }
    return made;
  };

  const purge = () => {
    retiring.forEach((el) => {
      gsap.killTweensOf(el);
      el.remove();
    });
    retiring = [];
  };

  const set = (text: string) => {
    purge();
    live.forEach((el) => el.remove());
    sizer.textContent = text;
    live = build(text);
    gsap.set(live, { x: 0, opacity: 1 });
    host.style.width = '';
  };

  const swap = (text: string, tl: gsap.core.Timeline, at = 0) => {
    // A swap interrupted mid-flight leaves its old bands behind; clear them
    // before measuring anything.
    purge();

    const outgoing = live;
    const fromW = host.offsetWidth;
    sizer.textContent = text;
    host.style.width = '';
    const toW = host.offsetWidth;

    const incoming = build(text);
    live = incoming;
    retiring = outgoing;

    const kick = (parseFloat(getComputedStyle(host).fontSize) || 16) * travel;
    gsap.set(incoming, { x: (i: number) => -throwOf(i) * kick, opacity: 0 });

    tl.to(
      outgoing,
      {
        x: (i: number) => throwOf(i) * kick,
        duration: 0.62,
        ease: 'power2.in',
        stagger: { each: 0.026, from: 'center' },
      },
      at
    )
      /* Held opaque well into the throw, so the two words genuinely share the
         line for a moment instead of one dissolving before the other lands. */
      .to(
        outgoing,
        {
          opacity: 0,
          duration: 0.32,
          ease: 'power1.in',
          stagger: { each: 0.026, from: 'center' },
        },
        at + 0.28
      )
      /* The box travels with the word rather than snapping to the new
         measure — bands are absolute, so nothing reflows on the way. */
      .fromTo(
        host,
        { width: fromW },
        { width: toW, duration: 0.82, ease: 'power3.inOut' },
        at + 0.08
      )
      .to(
        incoming,
        {
          x: 0,
          opacity: 1,
          duration: 0.95,
          ease: 'expo.out',
          stagger: { each: 0.03, from: 'edges' },
        },
        at + 0.24
      )
      .add(() => {
        purge();
        host.style.width = '';
      }, at + DURATION);
  };

  return {
    set,
    swap,
    duration: DURATION,
    destroy() {
      purge();
      gsap.killTweensOf([host, ...live]);
      host.replaceChildren();
      host.classList.remove(s.rig);
      host.style.width = '';
    },
  };
}
