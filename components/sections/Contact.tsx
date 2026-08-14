'use client';

import { useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { useGsap, useMagnetic, useReducedMotion } from '@/lib/hooks';
import Marker from '../ui/Marker';
import s from './Contact.module.css';

const EMAIL = 'hello@1-1.studio';

export default function Contact() {
  const root = useRef<HTMLElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const copyRef = useMagnetic<HTMLButtonElement>(0.4, 60);
  const reduced = useReducedMotion();

  useGsap(
    () => {
      gsap.fromTo(
        `.${s.line} > span`,
        { yPercent: 118 },
        {
          yPercent: 0,
          duration: reduced ? 0.001 : 1.35,
          ease: 'expo.out',
          stagger: 0.09,
          scrollTrigger: { trigger: `.${s.statement}`, start: 'top 80%' },
        }
      );

      gsap.fromTo(
        `.${s.bar}`,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: reduced ? 0.001 : 1.3,
          ease: 'expo.out',
          scrollTrigger: { trigger: `.${s.bar}`, start: 'top 88%' },
        }
      );

      if (reduced) return;

      /* The ticker runs continuously; the two groups are identical so the
         wrap at -50% is seamless. */
      gsap.to(tickerRef.current, {
        xPercent: -50,
        duration: 26,
        ease: 'none',
        repeat: -1,
      });
    },
    root,
    [reduced]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — the address is visible and selectable above.
      setCopied(false);
    }
  };

  const items = Array.from({ length: 4 }, (_, i) => (
    <span className={s.tickerItem} key={i}>
      Start a project
      <i className={s.tickerMark} aria-hidden="true">
        ✳
      </i>
    </span>
  ));

  return (
    <section
      className={`section ${s.section}`}
      id="contact"
      data-section="contact"
      data-surface="paper"
      ref={root}
    >
      <Marker index="06" title="Contact" meta="The short version" />

      <div className={s.top}>
        <span className={`${s.avail} mono`}>
          Open for commissions
          <i className={s.availDot} />
        </span>
      </div>

      <p className={s.statement}>
        <span className="sr-only">Let&rsquo;s make something.</span>
        <span className={`display ${s.line}`} aria-hidden="true">
          <span>Let&rsquo;s</span>
        </span>
        <span className={`display ${s.line} ${s.lineB}`} aria-hidden="true">
          <span>Make</span>
        </span>
        <span className={`display ${s.line}`} aria-hidden="true">
          <span>
            Something<i className={s.stop}>.</i>
          </span>
        </span>
      </p>

      <a
        className={`${s.bar} bleed`}
        href={`mailto:${EMAIL}`}
        data-cursor="Say hi"
        data-cursor-fill="true"
        data-surface="red"
      >
        <span className="sr-only">Email the studio at {EMAIL}</span>
        <span className={s.ticker} ref={tickerRef} aria-hidden="true">
          <span className={s.tickerGroup}>{items}</span>
          <span className={s.tickerGroup}>{items}</span>
        </span>
        <span className={`${s.barMeta} mono mono--micro`} aria-hidden="true">
          <span>Reply within two working days</span>
          <span>{EMAIL}</span>
        </span>
      </a>

      <div className={s.direct}>
        <div className={s.emailBlock}>
          <span className="mono faint">Direct</span>
          <a className={s.email} href={`mailto:${EMAIL}`} data-cursor="Email">
            {EMAIL}
          </a>
          <button className={`${s.copy} mono`} onClick={copy} ref={copyRef} data-done={copied}>
            <i className={s.copyDot} aria-hidden="true" />
            {copied ? 'Copied to clipboard' : 'Copy address'}
          </button>
        </div>

        <div className={`${s.socials} mono`}>
          <a href="https://instagram.com" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
        </div>
      </div>
    </section>
  );
}
