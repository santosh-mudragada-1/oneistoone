'use client';

import { useRef, useState } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useGsap } from '@/lib/hooks';
import HelixField, { RESOLVED, SWAP, partHex, type HelixDriver } from '../canvas/HelixField';
import { createSliceRig, type SliceRig } from '../type/sliceRig';
import Marker from '../ui/Marker';
import s from './Think.module.css';

/**
 * One strand, made in three places.
 *
 * A business has one DNA. Strategy, brand and marketing are three lengths of
 * the same strand — and when each of them is made somewhere else, each comes
 * back in a different palette. The helix on the right is continuous; the rules
 * laid across it are what divide it into three parts, not breaks in it.
 *
 * Scrolling brings every part to one colour, one part at a time, and re-cuts
 * each line as its part resolves. Everything here is a pure function of scroll
 * progress, so scrolling back takes the colours apart again and puts the
 * original lines back.
 */

const ROWS = [
  { split: 'Strategy from one place.', joined: 'One strategy.' },
  { split: 'Brand from another.', joined: 'One system.' },
  { split: 'Marketing somewhere else.', joined: 'Every expression.' },
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export default function Think() {
  const root = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<HTMLDivElement[]>([]);
  const hostRefs = useRef<HTMLSpanElement[]>([]);
  const hexRefs = useRef<HTMLSpanElement[]>([]);
  const bridgeRef = useRef<HTMLParagraphElement>(null);
  const driver = useRef<HelixDriver>({ progress: 0, cuts: [0.34, 0.67], hot: null });
  const [left, setLeft] = useState(3);
  const [hot, setHot] = useState<number | null>(null);

  useGsap(
    () => {
      const hosts = hostRefs.current.filter(Boolean);
      if (hosts.length !== ROWS.length) return;

      const rigs: SliceRig[] = hosts.map((el) => createSliceRig(el, { align: 'left' }));
      rigs.forEach((rig, i) => rig.set(ROWS[i].split));

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const setBridge = gsap.quickSetter(bridgeRef.current!, 'opacity');
        const cut = [false, false, false];
        const tls: (gsap.core.Timeline | null)[] = [null, null, null];

        /* Each line is re-cut when its own part of the strand comes over to
           the one colour. Threshold, not scrub: the swap plays whole in either
           direction rather than being smeared across the scroll. */
        const recut = (i: number, to: boolean) => {
          if (to === cut[i]) return;
          cut[i] = to;
          tls[i]?.kill();
          const tl = gsap.timeline();
          tls[i] = tl;
          rigs[i].swap(to ? ROWS[i].joined : ROWS[i].split, tl, 0);
        };

        /* Where the two rules sit on the strand. Measured on refresh only —
           nothing here reflows while the section is being scrolled. */
        const measure = () => {
          const stage = stageRef.current;
          const a = rowRefs.current[1];
          const b = rowRefs.current[2];
          if (!stage || !a || !b) return;
          const sr = stage.getBoundingClientRect();
          if (!sr.height) return;
          driver.current.cuts = [
            (a.getBoundingClientRect().top - sr.top) / sr.height,
            (b.getBoundingClientRect().top - sr.top) / sr.height,
          ];
        };

        const shown = ['', '', ''];

        const draw = (p: number) => {
          driver.current.progress = p;
          ROWS.forEach((_, i) => {
            recut(i, p >= SWAP[i]);
            /* The value each length is carrying, written straight into the
               row. It is the plainest way to say what is happening: three
               different numbers becoming one. */
            const hex = partHex(i, p);
            if (hex !== shown[i]) {
              shown[i] = hex;
              const el = hexRefs.current[i];
              if (el) {
                el.textContent = hex;
                el.style.color = hex;
              }
            }
          });
          // The first length was already the studio's own colour.
          setLeft(3 - (p >= SWAP[1] ? 1 : 0) - (p >= SWAP[2] ? 1 : 0));
          setBridge(clamp01((p - RESOLVED) / 0.08));
        };

        const st = ScrollTrigger.create({
          trigger: wrapRef.current,
          start: 'top top',
          end: 'bottom bottom',
          invalidateOnRefresh: true,
          onUpdate: (self) => draw(self.progress),
          onRefresh: (self) => {
            measure();
            draw(self.progress);
          },
        });

        return () => {
          st.kill();
          tls.forEach((t) => t?.kill());
        };
      });

      return () => {
        mm.revert();
        rigs.forEach((r) => r.destroy());
      };
    },
    root,
    []
  );

  return (
    <section
      className={`section ${s.section}`}
      id="think"
      data-section="think"
      data-surface="ink"
      ref={root}
    >
      <Marker index="03" title="The Way We Think" meta="One strand, three places" />

      <p className="sr-only">
        Your business shouldn&rsquo;t feel fragmented. Strategy from one place. Brand from
        another. Marketing somewhere else. We bring it together. One strategy. One system.
        Every expression.
      </p>

      <div className={s.pinWrap} ref={wrapRef} aria-hidden="true">
        <div className={s.stage} ref={stageRef}>
          <div className={s.helix}>
            <HelixField driver={driver} />
          </div>

          <div className={s.head}>
            <p className={s.opener}>Your business shouldn&rsquo;t feel fragmented.</p>
            <span className={`${s.state} mono`} data-on={left === 1}>
              Palettes <b>{String(left).padStart(2, '0')}</b>
            </span>
          </div>

          <div className={s.rows} data-holding={hot !== null}>
            {ROWS.map((r, i) => (
              <div
                className={s.row}
                key={r.split}
                data-hot={hot === i}
                onPointerEnter={() => {
                  driver.current.hot = i;
                  setHot(i);
                }}
                onPointerLeave={() => {
                  driver.current.hot = null;
                  setHot(null);
                }}
                ref={(el) => {
                  if (el) rowRefs.current[i] = el;
                }}
              >
                <span className={`${s.idx} mono`}>{String(i + 1).padStart(2, '0')}</span>
                <span
                  className={s.host}
                  ref={(el) => {
                    if (el) hostRefs.current[i] = el;
                  }}
                />
                <span
                  className={`${s.hex} mono mono--micro`}
                  ref={(el) => {
                    if (el) hexRefs.current[i] = el;
                  }}
                />
              </div>
            ))}
          </div>

          {/* Directly under the last line, on the same measure: where the eye
              goes when it has finished reading the three. */}
          <p className={s.bridge} ref={bridgeRef}>
            <i aria-hidden="true" />
            We bring it together.
          </p>
        </div>
      </div>

      {/* Shown by CSS only when motion is reduced. */}
      <div className={s.staticView} aria-hidden="true">
        <p className={s.opener}>Your business shouldn&rsquo;t feel fragmented.</p>
        <ol className={s.staticList}>
          {ROWS.map((r, i) => (
            <li key={r.split} data-part={i}>
              <span className={`${s.staticSplit} mono`}>{r.split}</span>
              <span className={s.staticJoined}>{r.joined}</span>
            </li>
          ))}
        </ol>
        <p className={s.bridge}>We bring it together.</p>
      </div>
    </section>
  );
}
