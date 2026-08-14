'use client';

import { useCallback, useEffect, useState } from 'react';
import Cursor from '@/components/Cursor';
import GridOverlay from '@/components/GridOverlay';
import Nav from '@/components/Nav';
import PageFrame from '@/components/PageFrame';
import Preloader from '@/components/Preloader';
import SmoothScroll from '@/components/SmoothScroll';
import HeroAperture from '@/components/hero/HeroAperture';
import HeroStatement from '@/components/hero/HeroStatement';
import HeroSwitch, { type HeroVersion } from '@/components/hero/HeroSwitch';
import Contact from '@/components/sections/Contact';
import Footer from '@/components/sections/Footer';
import Playground from '@/components/sections/Playground';
import PointOfView from '@/components/sections/PointOfView';
import Process from '@/components/sections/Process';
import Services from '@/components/sections/Services';
import { ScrollTrigger } from '@/lib/gsap';

const STORE_KEY = '11-hero-version';

export default function Page() {
  const [ready, setReady] = useState(false);
  const [hero, setHero] = useState<HeroVersion>('aperture');
  /* Once the reader has swapped versions there is no loading curtain to chain
     off, so the incoming hero lands at rest instead of replaying its entrance. */
  const [swapped, setSwapped] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORE_KEY);
    if (saved === 'aperture' || saved === 'statement') setHero(saved);
  }, []);

  /* Layout settles behind the preloader; measure once it hands over, and
     again after webfonts land in case metrics shifted. */
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
    return () => window.clearTimeout(id);
  }, [ready]);

  /* Swapping heroes changes the document height, so every trigger below has
     to be re-measured — and the reader should be looking at what changed. */
  const changeHero = useCallback((v: HeroVersion) => {
    setHero(v);
    setSwapped(true);
    try {
      window.localStorage.setItem(STORE_KEY, v);
    } catch {
      // Private mode — the choice just will not persist.
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    return () => window.clearTimeout(id);
  }, [hero]);

  return (
    <SmoothScroll>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <Preloader onDone={() => setReady(true)} />
      <Cursor />
      <PageFrame />
      <GridOverlay />
      {/* Remounts when the hero swaps: the nav tracks section nodes, and the
          outgoing hero's node is removed from the document. */}
      <Nav key={hero} />

      <main id="main">
        {hero === 'aperture' ? (
          <HeroAperture key="aperture" ready={ready} intro={!swapped} />
        ) : (
          <HeroStatement key="statement" ready={ready} intro={!swapped} />
        )}
        <PointOfView />
        <Services />
        <Process />
        <Playground />
        <Contact />
      </main>

      <Footer />
      <HeroSwitch value={hero} onChange={changeHero} />
    </SmoothScroll>
  );
}
