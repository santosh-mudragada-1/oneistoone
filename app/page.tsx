'use client';

import { useEffect, useState } from 'react';
import Cursor from '@/components/Cursor';
import GridOverlay from '@/components/GridOverlay';
import Nav from '@/components/Nav';
import PageFrame from '@/components/PageFrame';
import Preloader from '@/components/Preloader';
import SmoothScroll from '@/components/SmoothScroll';
import Hero from '@/components/hero/HeroStatement';
import Contact from '@/components/sections/Contact';
import Footer from '@/components/sections/Footer';
import Playground from '@/components/sections/Playground';
import Process from '@/components/sections/Process';
import Ratio from '@/components/sections/Ratio';
import Services from '@/components/sections/Services';
import { ScrollTrigger } from '@/lib/gsap';

export default function Page() {
  const [ready, setReady] = useState(false);

  /* Layout settles behind the preloader; measure once it hands over, and
     again after webfonts land in case metrics shifted. */
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
    return () => window.clearTimeout(id);
  }, [ready]);

  return (
    <SmoothScroll>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <Preloader onDone={() => setReady(true)} />
      <Cursor />
      <PageFrame />
      <GridOverlay />
      <Nav />

      <main id="main">
        <Hero ready={ready} />
        <Ratio />
        <Services />
        <Process />
        <Playground />
        <Contact />
      </main>

      <Footer />
    </SmoothScroll>
  );
}
